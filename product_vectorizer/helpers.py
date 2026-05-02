import os
import sys
import logging
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional

# qdrant models used for defaults and collection creation
from qdrant_client.models import (
    PointStruct, VectorParams, Distance,
    ScalarQuantization, ScalarQuantizationConfig, ScalarType,
    HnswConfigDiff
)

# Ensure root is in path to import id_helpers when running in different contexts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from id_helpers import get_point_id
except ImportError:
    from ..id_helpers import get_point_id

from .config import config,Config

logger = logging.getLogger(__name__)

class Helpers:
    def __init__(self, config: Config = None) -> None:
        self.config = config or config

    def is_null(self, value: Any) -> bool:
        return value is None or (isinstance(value, str) and not value.strip())

    def get_text_embedding(self, text: str) -> List[float]:
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

    def get_image_embedding(self, image_url: str) -> List[float]:
        if self.is_null(image_url):
            return [0.0] * self.config.visual_embed_dim

        try:
            url = f"{self.config.embedding_service_url}/embed/image"
            response = requests.post(url, json={"image_url": image_url}, timeout=10)
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            logger.warning("Image embedding failed for %s: %s", image_url, e)
            return [0.0] * self.config.visual_embed_dim

    def get_product_point(self, product_id: str) -> PointStruct:
        point_id = get_point_id(product_id)
        try:
            res = self.config.qdrant.retrieve(
                collection_name="products",
                ids=[point_id],
                with_vectors=True,
                with_payload=True
            )
            if res:
                return res[0]
        except Exception:
            logger.debug("Product point not found for %s; returning default schema", product_id)

        # Default schema
        return PointStruct(
            id=point_id,
            vector={
                "text_vector": [0.0] * self.config.text_embed_dim,
                "visual_vector": [0.0] * self.config.visual_embed_dim,
                "typical_user_vector": [0.0] * self.config.text_embed_dim
            },
            payload={
                "product_id": product_id,
                "metadata": {},
                "stats": {"purchase_count": 0, "view_count": 0, "add_to_cart_count": 0, "return_count": 0, "hesitation_count": 0},
                "scores": {"desirability_score": 0.5},
                "warnings": {"quality_flag": False},
                "review_data": {"extracted_tags": [], "sentiment_score": 0.0}
            }
        )

    def get_user_long_term_taste(self, user_id: str) -> Optional[List[float]]:
        user_uuid = get_point_id(user_id)
        try:
            res = self.config.qdrant.retrieve(
                collection_name="users",
                ids=[user_uuid],
                with_vectors=["long_term_taste"]
            )
            if res:
                return res[0].vector.get("long_term_taste")
        except Exception:
            logger.debug("User long-term taste not found for %s", user_id)
        return None

    def upsert_product(self, product_id: str, vector: Dict[str, List[float]], payload: Dict[str, Any]) -> None:
        point_id = get_point_id(product_id)
        try:
            self.config.qdrant.upsert(
                collection_name="products",
                points=[PointStruct(id=point_id, vector=vector, payload=payload)]
            )
        except Exception as e:
            logger.exception("Error upserting product %s: %s", product_id, e)

    def ensure_product_collections(self) -> None:
        quantization_config = ScalarQuantization(
            scalar=ScalarQuantizationConfig(type=ScalarType.INT8, always_ram=True, quantile=0.99)
        )
        hnsw_config = HnswConfigDiff(m=16, ef_construct=100, full_scan_threshold=1000)

        if not self.config.qdrant.collection_exists("products"):
            logger.info("Creating products collection...")
            self.config.qdrant.create_collection(
                collection_name="products",
                vectors_config={
                    "text_vector": VectorParams(size=self.config.text_embed_dim, distance=Distance.COSINE, on_disk=True),
                    "visual_vector": VectorParams(size=self.config.visual_embed_dim, distance=Distance.COSINE, on_disk=True),
                    "typical_user_vector": VectorParams(size=self.config.text_embed_dim, distance=Distance.COSINE, on_disk=True),
                },
                quantization_config=quantization_config,
                hnsw_config=hnsw_config
            )

# Default helpers instance for convenience
helpers = Helpers(config)

def ensure_product_collections() -> None:
    """Convenience wrapper to ensure Qdrant product collections exist."""
    helpers.ensure_product_collections()
