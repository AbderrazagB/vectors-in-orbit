import random
from typing import List, Dict, Any
from qdrant_client.models import Filter, FieldCondition, MatchValue, ScoredPoint

from id_helpers import get_point_id
from .config import Config
from .helpers import SearchHelpers
from .reranking import RerankingLayer

class FeedPipeline:
    """
    Generates a Multi-Section 'For You' Page.
    Structure:
    1. Wishlist Inspiration (Multiple sections, one per active intent)
    2. "Because you like..." (Collaborative Filtering)
    3. Trending Now (Desirability Score)
    """

    def __init__(self):
        self.config = Config()
        self.helpers = SearchHelpers(self.config)
        self.client = self.helpers.qdrant
        self.reranker = RerankingLayer()

    def _get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Fetch User Profile + Intents"""
        user_uuid = get_point_id(user_id)
        context = {"profile": {}, "wishlist": []}

        # Fetch Profile
        try:
            res = self.client.retrieve("users", [user_uuid], with_vectors=True, with_payload=True)
            if res:
                context["profile"] = {"vector": res[0].vector, "payload": res[0].payload}
            else:
                # Cold start default
                context["profile"] = {
                    "vector": {}, 
                    "payload": {
                        "demographics": {"status": "unknown"},
                        "financials": {"global_ltv": 0},
                        "traits": []
                    }
                }
        except: pass

        # Fetch Active Wishlist (Limit 10)
        try:
            intent_filter = Filter(must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(key="status", match=MatchValue(value="active")),
                FieldCondition(key="type", match=MatchValue(value="passive_wishlist"))
            ])
            intents, _ = self.client.scroll(
                "user_intents", scroll_filter=intent_filter, limit=10, with_payload=True, with_vectors=True
            )
            # Store in context
            context["wishlist"] = [{"vectors": i.vector, "payload": i.payload} for i in intents]
        except: pass

        return context

    def _fetch_trending_items(self, limit: int = 20) -> List[Any]:
        try:
            popular_items, _ = self.client.scroll(
                collection_name="products",
                limit=100, 
                with_payload=True,
                with_vectors=True
            )
            
            if not popular_items:
                return []

            popular_items.sort(
                key=lambda x: x.payload.get('stats', {}).get('purchase_count', 0), 
                reverse=True
            )
            
            top_items = popular_items[:limit]

            max_purchases = 1
            for item in top_items:
                pc = item.payload.get('stats', {}).get('purchase_count', 0)
                if pc > max_purchases: max_purchases = pc

            scored_candidates = []
            for item in top_items:
                pc = item.payload.get('stats', {}).get('purchase_count', 0)
                desire = item.payload.get('scores', {}).get('desirability_score', 0.5)
                
                syn_score = 0.6 + (0.4 * (pc / max_purchases) if max_purchases > 0 else 0)
                
                new_point = ScoredPoint(
                    id=item.id,
                    version=0,
                    score=syn_score,
                    payload=item.payload,
                    vector=item.vector
                )
                scored_candidates.append(new_point)
            
            return scored_candidates

        except Exception as e:
            return []

    def _process_section(self, 
                         candidates: List[Any], 
                         profile: Dict, 
                         wishlist: List[Dict], 
                         section_title: str, 
                         limit: int = 5,
                         is_trending: bool = False) -> Dict[str, Any]:
        
        if not candidates:
            return None

        sanitized = []
        for c in candidates:
            if not hasattr(c, 'payload') or c.payload is None: c.payload = {}
            if 'hybrid_debug' not in c.payload: c.payload['hybrid_debug'] = {}
            
            if is_trending:
                c.payload['hybrid_debug']['intent'] = 'specific_product'
            else:
                c.payload['hybrid_debug']['intent'] = 'broad_explore'
            
            sanitized.append(c)

        ranked = self.reranker.rerank(
            candidates=sanitized,
            user_profile=profile,
            user_wishlist=wishlist,
            query_text="", 
            top_n=len(sanitized)
        )

        final_items = []
        dropped_count = 0
        
        for r in ranked:
            if is_trending:
                budget_fit = r['scores'].get('budget_fit', 1.0)
                if budget_fit < 0.1: 
                    dropped_count += 1
                    continue 

            if "match_reason" not in r or r["match_reason"] == "Personalized recommendation":
                r["match_reason"] = r["payload"].get("feed_reason", "Trending")
            
            final_items.append(r)
            if len(final_items) >= limit: break

        if not final_items: return None

        return {
            "section_title": section_title,
            "items": final_items
        }

    def generate(self, user_id: str) -> List[Dict[str, Any]]:
        
        ctx = self._get_user_context(user_id)
        profile = ctx['profile']
        wishlist = ctx['wishlist']
        
        wishlist.sort(key=lambda x: x['payload'].get('urgency_score', 0), reverse=True)
        
        feed_sections = []

        if wishlist:
            for target in wishlist:
                intent_vec = target.get("vectors", {}).get("intent_vector")
                desc = target['payload'].get('product_desc', 'Unknown')
                if intent_vec:
                    try:
                        hits = self.client.query_points("products", query=intent_vec, using="text_vector", limit=6, with_payload=True, with_vectors=True).points
                        for h in hits: h.payload['feed_reason'] = f"Similar to '{desc}'"
                        section = self._process_section(hits, profile, wishlist, f"Because you want '{desc}'", limit=5)
                        if section: feed_sections.append(section)
                    except: pass

        user_taste = profile.get("vector", {}).get("long_term_taste")
        if user_taste:
            try:
                hits = self.client.query_points("products", query=user_taste, using="typical_user_vector", limit=15, with_payload=True, with_vectors=True).points
                for h in hits: h.payload['feed_reason'] = "Matches your style"
                section = self._process_section(hits, profile, wishlist, "Recommended for your style")
                if section: feed_sections.append(section)
            except: pass

        trending_candidates = self._fetch_trending_items(limit=20)
        if trending_candidates:
            for h in trending_candidates: h.payload['feed_reason'] = "Popular right now"
            section = self._process_section(trending_candidates, profile, wishlist, "Trending Now", is_trending=True)
            if section: feed_sections.append(section)

        return feed_sections