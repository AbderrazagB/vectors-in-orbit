from typing import List, Dict, Any, Optional
from .config import Config
from .retrieval import RetrievalLayer 
from .lexical import BM25Ranker
from .intent import IntentEngine

class HybridSearchEngine:
    def __init__(self, retrieval_layer: RetrievalLayer, bm25_ranker: BM25Ranker):
        self.config, self.vector_db, self.bm25, self.intent_engine = Config(), retrieval_layer, bm25_ranker, IntentEngine()

    def search(self, query: str, user_payload: Dict[str, Any], explicit_filters: Optional[Dict[str, Any]] = None, limit: int = 20) -> List[Any]:
        intent_data = self.intent_engine.predict_intent(query)
        intent_type, confidence = intent_data["intent_type"], intent_data["confidence"]
        alpha, beta = (0.85, 0.15) if intent_type == "specific_product" else (0.2, 0.8)
        vector_results = self.vector_db.retrieve(query_text=query, explicit_filters=explicit_filters, limit=limit * 3)
        bm25_results = self.bm25.search(query, top_k=limit * 3)
        
        fusion_map = {}
        
        # Normalize Vector Scores
        # Qdrant scores (Cosine) are usually -1 to 1.
        v_scores = [h.score for h in vector_results]
        max_v = max(v_scores) if v_scores and max(v_scores) > 0 else 1.0
        
        for hit in vector_results:
            fusion_map[hit.id] = {
                "obj": hit,
                "v_score": hit.score / max_v,
                "b_score": 0.0
            }
            
        # Normalize BM25 Scores (Can be > 10)
        b_scores = [r['bm25_score'] for r in bm25_results]
        max_b = max(b_scores) if b_scores and max(b_scores) > 0 else 1.0
        
        for res in bm25_results:
            pid = res['id']
            # Only boost items found in Vector Search to avoid extra DB lookups
            if pid in fusion_map:
                fusion_map[pid]['b_score'] = res['bm25_score'] / max_b

        # Calculate Final Score
        final_candidates = []
        for pid, data in fusion_map.items():
            final_score = (alpha * data['b_score']) + (beta * data['v_score'])
            
            hit = data['obj']
            hit.score = final_score
            
            # Debug info
            hit.payload['hybrid_debug'] = {
                "intent": intent_type,
                "bm25": round(alpha * data['b_score'], 3),
                "vector": round(beta * data['v_score'], 3)
            }
            
            final_candidates.append(hit)

        final_candidates.sort(key=lambda x: x.score, reverse=True)
        return final_candidates[:limit]