import os
import sys
import logging
import requests
from typing import List, Dict, Any, Optional
from qdrant_client.models import PointStruct
from .config import config

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from id_helpers import get_point_id
except ImportError:
    from ..id_helpers import get_point_id

logger = logging.getLogger(__name__)

class Helpers:
    def __init__(self, config):
        self.config = config

    @staticmethod
    def is_null(value: Any) -> bool:
        return value is None or (isinstance(value, str) and not value.strip())

    def get_text_embedding(self, text: str) -> Optional[List[float]]:
        if self.is_null(text):
            return [0.0] * self.config.text_embed_dim
        try:
            url = f"{self.config.embedding_service_url}/embed/text"
            response = requests.post(url, json={"text": text}, timeout=10)
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            logger.warning("Text embedding failed: %s", e)
            return [0.0] * self.config.text_embed_dim

    def get_image_embedding(self, image_url: str) -> Optional[List[float]]:
        if self.is_null(image_url):
            return [0.0] * self.config.visual_embed_dim
        try:
            url = f"{self.config.embedding_service_url}/embed/image"
            response = requests.post(url, json={"image_url": image_url}, timeout=10)
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            logger.warning("Image embedding failed: %s", e)
            return [0.0] * self.config.visual_embed_dim

    def user_point_id(self, user_id: str) -> str:
        return get_point_id(user_id)

    def upsert_user(self, user_id: str, vector: Dict[str, Any], payload: Dict[str, Any]) -> None:
        point_id = self.user_point_id(user_id)
        payload["user_id"] = user_id
        self.config.qdrant.upsert(
            collection_name="users",
            points=[PointStruct(id=point_id, vector=vector, payload=payload)]
        )

    def get_user_point(self, user_id: str, with_vectors: bool = False) -> PointStruct:
        if self.is_null(user_id):
            return None
        point_id = self.user_point_id(user_id)
        try:
            res = self.config.qdrant.retrieve(
                collection_name="users",
                ids=[point_id],
                with_vectors=with_vectors,
                with_payload=True
            )
            if res:
                return res[0]
        except Exception as e:
            logger.warning("Failed to retrieve user point: %s", e)
        return PointStruct(
            id=point_id,
            vector={
                "long_term_taste": [0.0] * self.config.text_embed_dim,
                "negative_taste": [0.0] * self.config.text_embed_dim
            },
            payload={
                "user_id": user_id,
                "financials": {
                    "category_stats": {},
                    "global_ltv": 0.0,
                    "global_discount_affinity": 0.0,
                    "installment_affinity": 0.0,
                    "luxury_affinity": 0.0
                },
                "preferences": {"brand_affinity": {}, "size_affinity": {}},
                "demographics": {},
                "traits": [],
                "life_events": [],
                "dislikes": [],
                "seasonality": {"active_months": [], "is_holiday_shopper": False}
            }
        )

    @staticmethod
    def update_rolling_avg(current_avg: float, count: int, new_val: float) -> float:
        return (current_avg * count + new_val) / (count + 1) if count > 0 else new_val

helpers = Helpers(config)

def ensure_collections():
    from qdrant_client.models import ScalarQuantization, ScalarQuantizationConfig, ScalarType, HnswConfigDiff, VectorParams, Distance
    quantization_config = ScalarQuantization(
        scalar=ScalarQuantizationConfig(type=ScalarType.INT8, always_ram=True, quantile=0.99)
    )
    hnsw_config = HnswConfigDiff(m=32, ef_construct=200)
    if not config.qdrant.collection_exists("users"):
        logger.info("Creating users collection...")
        config.qdrant.create_collection(
            collection_name="users",
            vectors_config={
                "long_term_taste": VectorParams(size=config.text_embed_dim, distance=Distance.COSINE, on_disk=True),
                "negative_taste": VectorParams(size=config.text_embed_dim, distance=Distance.COSINE, on_disk=True),
            },
            quantization_config=quantization_config,
            hnsw_config=hnsw_config
        )
    if not config.qdrant.collection_exists("user_intents"):
        logger.info("Creating user_intents collection...")
        config.qdrant.create_collection(
            collection_name="user_intents",
            vectors_config={
                "intent_vector": VectorParams(size=config.text_embed_dim, distance=Distance.COSINE),
                "visual_vector": VectorParams(size=config.visual_embed_dim, distance=Distance.COSINE)
            },
            quantization_config=quantization_config,
            hnsw_config=hnsw_config
        )
