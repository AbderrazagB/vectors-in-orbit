import os
from datetime import datetime
from typing import List, Optional
from abc import ABC, abstractmethod
from dotenv import load_dotenv

from qdrant_client.models import PointStruct

import sys
import logging
# Ensure id_helpers is importable in different contexts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from id_helpers import get_point_id
except ImportError:
    from ..id_helpers import get_point_id

from .config import config
from .helpers import helpers, ensure_product_collections

logger = logging.getLogger(__name__)



# ==========================================
# 2. TOOLS
# ==========================================

class Tool(ABC):
    @abstractmethod
    def execute(self, *args, **kwargs): pass


class UpsertProductProfile(Tool):
    

    def execute(self, product_id: str, name: Optional[str] = None, description: Optional[str] = None, 
                image_url: Optional[str] = None, category: Optional[str] = None, 
                brand: Optional[str] = None, gender: Optional[str] = None,
                condition: Optional[str] = None, price: Optional[float] = None,
                stock_quantity: Optional[int] = None, region: Optional[str] = None,
                tags: Optional[List[str]] = None, is_discounted: Optional[bool] = None):
        try:
            # 1. Fetch Existing
            existing = helpers.get_product_point(product_id)
            payload = existing.payload
            vectors = existing.vector
            
            # Ensure Payload Structure
            meta = payload.setdefault("metadata", {})
            payload.setdefault("stats", {"purchase_count": 0, "view_count": 0, "add_to_cart_count": 0, "return_count": 0, "hesitation_count": 0})
            payload.setdefault("scores", {"desirability_score": 0.5})
            payload.setdefault("warnings", {"quality_flag": False})

            # 2. Update Text Vector? (If semantic content changed)
            new_name = name or meta.get("name", "")
            new_desc = description or meta.get("description", "")
            new_tags = tags or meta.get("tags", [])
            new_brand = brand or meta.get("brand", "")
            
            if name or description or tags or brand:
                text_content = f"{new_name} {new_brand} {new_desc} {' '.join(new_tags)}"
                vectors["text_vector"] = helpers.get_text_embedding(text_content)

            # 3. Update Visual Vector?
            if image_url:
                v_vec = helpers.get_image_embedding(image_url)
                if any(x != 0 for x in v_vec): # Only update if successful
                    vectors["visual_vector"] = v_vec

            # 4. Merge Metadata (Upsert Logic)
            payload["product_id"] = product_id
            if name: meta["name"] = name
            if description: meta["description"] = description
            if category: meta["category"] = category
            if brand: meta["brand"] = brand
            if gender: meta["gender"] = gender
            if condition: meta["condition"] = condition
            if price is not None: meta["price"] = price
            if stock_quantity is not None: meta["stock_quantity"] = stock_quantity
            if region: meta["region"] = region
            if tags is not None: meta["tags"] = tags
            if is_discounted is not None: meta["is_discounted"] = is_discounted
            
            if image_url: meta["image_url"] = image_url
            meta["updated_at"] = datetime.now().isoformat()
            if "created_at" not in meta:
                meta["created_at"] = datetime.now().isoformat()

            payload["metadata"] = meta

            # 5. Upsert
            point_id = get_point_id(product_id)
            config.qdrant.upsert(
                collection_name="products",
                points=[PointStruct(id=point_id, vector=vectors, payload=payload)]
            )
            return f"success: product {product_id} profile updated"
        except Exception as e:
            return f"error: {e}"


class EvolveTypicalUser(Tool):
    
    def execute(self, product_id: str, user_id: str):
        try:
            buyer_vec = helpers.get_user_long_term_taste(user_id)
            if not buyer_vec:
                return "error: buyer profile not found, cannot evolve"

            product = helpers.get_product_point(product_id)
            current_typ_vec = product.vector.get("typical_user_vector", [0.0]*config.text_embed_dim)
            
            stats = product.payload.setdefault("stats", {})
            N = stats.get("purchase_count", 0)
            
            # Check if initialized (if all zeros, N=0)
            if all(v == 0.0 for v in current_typ_vec): N = 0

            # Cumulative Moving Average
            new_vec = []
            for c, b in zip(current_typ_vec, buyer_vec):
                val = ((c * N) + b) / (N + 1)
                new_vec.append(val)

            stats["purchase_count"] = N + 1
            product.payload["stats"] = stats
            product.vector["typical_user_vector"] = new_vec
            
            point_id = get_point_id(product_id)
            config.qdrant.upsert(
                collection_name="products",
                points=[PointStruct(id=point_id, vector=product.vector, payload=product.payload)]
            )
            return f"success: typical user evolved (N={N+1})"
        except Exception as e:
            return f"error: {e}"


class TrackInteraction(Tool):

    def execute(self, product_id: str, interaction_type: str, desirability_delta: float):
        try:
            pt = helpers.get_product_point(product_id)
            stats, scores = pt.payload.setdefault("stats", {}), pt.payload.setdefault("scores", {})
            
            key_map = {"add": "add_to_cart_count", "buy": "purchase_count", "remove": "hesitation_count"}
            key = key_map.get(interaction_type, f"{interaction_type}_count")
            stats[key] = stats.get(key, 0) + 1
            scores["desirability_score"] = max(0.0, min(1.0, scores.get("desirability_score", 0.5) + desirability_delta))
            
            helpers.upsert_product(product_id, pt.vector, pt.payload)
            return "success: interaction tracked"
        except Exception as e: return f"error: {e}"



class LogReviewInsights(Tool):

    def execute(self, product_id: str, sentiment_score: float, extracted_tags: List[str], is_quality_issue: bool):
        try:
            pt = helpers.get_product_point(product_id)
            rd = pt.payload.setdefault("review_data", {}); rd["extracted_tags"] = list(set(rd.get("extracted_tags", [])) | set(extracted_tags or [])); rd["sentiment_score"] = sentiment_score
            if is_quality_issue: pt.payload.setdefault("warnings", {})["quality_flag"] = True
            
            sc = pt.payload.setdefault("scores", {}); sc["desirability_score"] = max(0.0, min(1.0, sc.get("desirability_score", 0.5) + sentiment_score * 0.1))
            helpers.upsert_product(product_id, pt.vector, pt.payload)
            return "success: review insights logged"
        except Exception as e: return f"error: {e}"

class ProcessReturnImpact(Tool):

    def execute(self, product_id: str, user_id: str, is_taste_mismatch: bool):
        try:
            pt = helpers.get_product_point(product_id)
            st, sc = pt.payload.setdefault("stats", {}), pt.payload.setdefault("scores", {})
            st["return_count"] = st.get("return_count", 0) + 1; sc["desirability_score"] = max(0.0, sc.get("desirability_score", 0.5) - 0.15)
            
            if is_taste_mismatch and (bv := helpers.get_user_long_term_taste(user_id)):
                pt.vector["typical_user_vector"] = [(c - (b * 0.05)) for c, b in zip(pt.vector.get("typical_user_vector", [0.0]*config.text_embed_dim), bv)]
                
            helpers.upsert_product(product_id, pt.vector, pt.payload)
            return "success: return processed"
        except Exception as e: return f"error: {e}"
