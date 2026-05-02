import uuid
from typing import List, Dict, Any, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue
from id_helpers import get_point_id
from .config import Config
from .helpers import SearchHelpers
from .retrieval import RetrievalLayer
from .reranking import RerankingLayer
from .lexical import BM25Ranker
from .hybrid import HybridSearchEngine

class RecommendationPipeline:
    def __init__(self):
        self.config, self.helpers = Config(), SearchHelpers(Config())
        self.client = self.helpers.qdrant
        self.retrieval_layer, self.reranking_layer = RetrievalLayer(helpers=self.helpers), RerankingLayer()
        self.bm25_ranker = BM25Ranker()
        self._build_lexical_index()
        self.hybrid_engine = HybridSearchEngine(retrieval_layer=self.retrieval_layer, bm25_ranker=self.bm25_ranker)

    def _build_lexical_index(self):
        try:
            all_records, next_offset = [], None
            while True:
                batch, next_offset = self.client.scroll("products", limit=100, with_payload=True, with_vectors=False, offset=next_offset)
                all_records.extend(batch)
                if next_offset is None: break
            self.bm25_ranker.index_products([{**r.payload, 'id': r.id} for r in all_records])
        except: pass

    def _get_user_context(self, user_id: str) -> Dict[str, Any]:
        user_uuid, context = get_point_id(user_id), {"profile": {}, "wishlist": []}
        try:
            res = self.client.retrieve("users", [user_uuid], with_vectors=True, with_payload=True)
            context["profile"] = {"vector": res[0].vector, "payload": res[0].payload} if res else {"vector": {}, "payload": {"financials": {"global_ltv": 0}}}
        except: context["profile"] = {"vector": {}, "payload": {"financials": {"global_ltv": 0}}}
        try:
            intents, _ = self.client.scroll("user_intents", scroll_filter=Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id)), FieldCondition(key="status", match=MatchValue(value="active")), FieldCondition(key="type", match=MatchValue(value="passive_wishlist"))]), limit=10, with_payload=True, with_vectors=True)
            context["wishlist"] = [{"vectors": i.vector, "payload": i.payload} for i in intents]
        except: pass
        return context

    def execute(self, user_id: str, query_text: str, explicit_filters: Optional[Dict[str, Any]] = None, limit: int = 20) -> List[Dict[str, Any]]:
        context = self._get_user_context(user_id)
        candidates = self.hybrid_engine.search(query=query_text, user_payload=context["profile"].get("payload", {}), explicit_filters=explicit_filters, limit=limit * 2)
        if not candidates: return []
        final_results = self.reranking_layer.rerank(candidates=candidates, query_text=query_text, user_profile=context["profile"], user_wishlist=context["wishlist"], top_n=limit * 2)
        return final_results[:limit]