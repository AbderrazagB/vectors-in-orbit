from typing import List, Dict, Any, Optional
from qdrant_client.models import ScoredPoint
from .config import Config
from .helpers import SearchHelpers
from .constraints import ConstraintLayer

class RetrievalLayer:
    def __init__(self, helpers: Optional[SearchHelpers] = None):
        self.config = Config()
        self.helpers = helpers if helpers else SearchHelpers(self.config)
        self.client = self.helpers.qdrant

    def retrieve(self, query_text: str, explicit_filters: Optional[Dict[str, Any]] = None, limit: int = 20) -> List[ScoredPoint]:
        semantic_vector = self.helpers.get_text_embedding(query_text)
        visual_query_vector = self.helpers.get_clip_text_embedding(query_text)
        qdrant_filter = ConstraintLayer.build_filters(explicit_filters or {})
        try:
            hits_text = self.client.query_points("products", query=semantic_vector, using="text_vector", query_filter=qdrant_filter, limit=limit, with_payload=True).points
            hits_visual = self.client.query_points("products", query=visual_query_vector, using="visual_vector", query_filter=qdrant_filter, limit=limit, with_payload=True).points
            merged = {h.id: h for h in hits_text}
            for h in hits_visual:
                if h.id not in merged: merged[h.id] = h
            return list(merged.values())
        except: return []