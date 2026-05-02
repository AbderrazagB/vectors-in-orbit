import os
import sys
import uuid
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
from dotenv import load_dotenv

from qdrant_client.models import (
    PointStruct, Filter, FieldCondition, MatchValue, 
    
)

# Shared imports handling
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from id_helpers import get_point_id
except ImportError:
    from ..id_helpers import get_point_id


from .config import config
from .helpers import helpers, ensure_collections



class Tool(ABC):
    @abstractmethod
    def execute(self, *args, **kwargs): pass

class ReinforcePositiveTaste(Tool):


    def execute(self, user_id: str, weight: float, product_id: str = None, concept_text: str = None):
        try:
            if helpers.is_null(user_id) or weight is None:
                return "error: missing required params for ReinforcePositiveTaste"

            if helpers.is_null(concept_text) and not helpers.is_null(product_id):
                 # Fetch product
                 try:
                    p_id = get_point_id(product_id)
                    res = config.qdrant.retrieve(
                        collection_name="products",
                        ids=[p_id],
                        with_payload=True
                    )
                    if res:
                        payload = res[0].payload
                        concept_text = payload.get("description") or payload.get("name") or payload.get("metadata", {}).get("name")
                 except Exception as ex:
                    return f"error: failed to retrieve product {product_id}: {ex}"

            if helpers.is_null(concept_text):
                return "error: concept_text was null and could not be inferred"

            user = helpers.get_user_point(user_id, with_vectors=True)
            current_vec = user.vector.get("long_term_taste", [0.0] * config.text_embed_dim)
            target_vec = helpers.get_text_embedding(concept_text)
            if target_vec is None:
                return "error: concept_text was null"

            new_vec = [(c * (1 - weight)) + (t * weight) for c, t in zip(current_vec, target_vec)]

            user.vector["long_term_taste"] = new_vec
            helpers.upsert_user(user_id, user.vector, user.payload)
            return "success: positive taste reinforced"
        except Exception as e:
            return f"error: {e}"


class LearnNegativeTaste(Tool):


    def execute(self, user_id: str, weight: float, reason_category: str, product_id: str = None, concept_text: str = None):
        try:
            if helpers.is_null(user_id) or weight is None or helpers.is_null(reason_category):
                return "error: missing required params for LearnNegativeTaste"

            if helpers.is_null(concept_text) and not helpers.is_null(product_id):
                 # Fetch product
                 try:
                    p_id = get_point_id(product_id)
                    res = config.qdrant.retrieve(
                        collection_name="products",
                        ids=[p_id],
                        with_payload=True
                    )
                    if res:
                        payload = res[0].payload
                        concept_text = payload.get("description") or payload.get("name") or payload.get("metadata", {}).get("name")
                 except Exception as ex:
                    return f"error: failed to retrieve product {product_id}: {ex}"

            if helpers.is_null(concept_text):
                 return "error: concept_text was null and could not be inferred"

            user = helpers.get_user_point(user_id, with_vectors=True)
            current_neg = user.vector.get("negative_taste", [0.0] * config.text_embed_dim)
            target_vec = helpers.get_text_embedding(concept_text)
            if target_vec is None:
                return "error: concept_text was null"

            new_neg = [(c * (1 - weight)) + (t * weight) for c, t in zip(current_neg, target_vec)]

            payload = user.payload
            payload.setdefault("dislikes", [])
            payload["dislikes"].append(f"{reason_category}: {concept_text}")

            user.vector["negative_taste"] = new_neg
            helpers.upsert_user(user_id, user.vector, payload)
            return "success: negative taste updated"
        except Exception as e:
            return f"error: {e}"


class UpdateBrandAffinity(Tool):

    def execute(self, user_id: str, increment: float, product_id: str = None, brand_name: str = None):
        try:
            if helpers.is_null(user_id) or increment is None:
                return "error: missing required params for UpdateBrandAffinity"

            if helpers.is_null(brand_name) and not helpers.is_null(product_id):
                # Retrieve product to get brand
                try:
                    p_id = get_point_id(product_id)
                    res = config.qdrant.retrieve(
                        collection_name="products",
                        ids=[p_id],
                        with_payload=True
                    )
                    if res:
                        meta = res[0].payload.get("metadata", {})
                        brand_name = meta.get("brand") or meta.get("brand_name")
                        
                        if not brand_name:
                            brand_name = res[0].payload.get("brand")

                except Exception as ex:
                    return f"error: failed to retrieve product {product_id}: {ex}"

            if helpers.is_null(brand_name):
                 return "error: brand_name not provided and could not be inferred from product_id"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("preferences", {})
            payload["preferences"].setdefault("brand_affinity", {})

            current_val = payload["preferences"]["brand_affinity"].get(brand_name, 0.0)
            payload["preferences"]["brand_affinity"][brand_name] = current_val + increment

            helpers.upsert_user(user_id, user.vector, payload)
            return f"success: brand affinity updated for {brand_name}"
        except Exception as e:
            return f"error: {e}"


class UpdateSizeAffinity(Tool):

    def execute(self, user_id: str, size_code: str):
        try:
            if helpers.is_null(user_id) or helpers.is_null(size_code):
                return "error: missing required params for UpdateSizeAffinity"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("preferences", {})
            payload["preferences"].setdefault("size_affinity", {})

            current_val = payload["preferences"]["size_affinity"].get(size_code, 0)
            payload["preferences"]["size_affinity"][size_code] = current_val + 1

            helpers.upsert_user(user_id, user.vector, payload)
            return "success: size affinity updated"
        except Exception as e:
            return f"error: {e}"


class AddPsychographicTrait(Tool):


    def execute(self, user_id: str, trait: str):
        try:
            if helpers.is_null(user_id) or helpers.is_null(trait):
                return "error: missing required params for AddPsychographicTrait"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("traits", [])
            if trait not in payload["traits"]:
                payload["traits"].append(trait)
                helpers.upsert_user(user_id, user.vector, payload)

            return "success: psychographic trait updated"
        except Exception as e:
            return f"error: {e}"


class LogLifeEvent(Tool):

    def execute(self, user_id: str, event_name: str, expiry_days: int):
        try:
            if helpers.is_null(user_id) or helpers.is_null(event_name) or expiry_days is None:
                return "error: missing required params for LogLifeEvent"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("life_events", [])

            expiry_date = (datetime.now() + timedelta(days=expiry_days)).isoformat()
            payload["life_events"].append({
                "event": event_name,
                "created_at": datetime.now().isoformat(),
                "expires_at": expiry_date
            })

            helpers.upsert_user(user_id, user.vector, payload)
            return "success: life event logged"
        except Exception as e:
            return f"error: {e}"


class UpdateDemographics(Tool):

    def execute(self, user_id: str, field: str, value: str):
        try:
            if helpers.is_null(user_id) or helpers.is_null(field) or helpers.is_null(value):
                return "error: missing required params for UpdateDemographics"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("demographics", {})
            payload["demographics"][field] = value

            helpers.upsert_user(user_id, user.vector, payload)
            return "success: demographics updated"
        except Exception as e:
            return f"error: {e}"


class ProcessTransactionStats(Tool):

    def execute(self, user_id: str, amount: float, category: str, is_discount: bool, is_luxury: bool, is_installment: bool):
        try:
            if helpers.is_null(user_id) or helpers.is_null(category) or amount is None or is_discount is None or is_luxury is None or is_installment is None:
                return "error: missing required params for ProcessTransactionStats"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload
            fin = payload.get("financials", {})

            fin.setdefault("category_stats", {})
            cat_stats = fin["category_stats"].get(category, {"avg_spend": 0.0, "max_spend": 0.0, "count": 0})

            count = cat_stats["count"]
            cat_stats["avg_spend"] = helpers.update_rolling_avg(cat_stats["avg_spend"], count, amount)
            cat_stats["max_spend"] = max(cat_stats["max_spend"], amount)
            cat_stats["count"] = count + 1
            fin["category_stats"][category] = cat_stats

            fin["global_ltv"] = fin.get("global_ltv", 0.0) + amount

            total_tx = sum([c["count"] for c in fin["category_stats"].values()])

            fin["global_discount_affinity"] = helpers.update_rolling_avg(fin.get("global_discount_affinity", 0.0), total_tx - 1, 1.0 if is_discount else 0.0)
            fin["luxury_affinity"] = helpers.update_rolling_avg(fin.get("luxury_affinity", 0.0), total_tx - 1, 1.0 if is_luxury else 0.0)
            fin["installment_affinity"] = helpers.update_rolling_avg(fin.get("installment_affinity", 0.0), total_tx - 1, 1.0 if is_installment else 0.0)

            payload["financials"] = fin
            helpers.upsert_user(user_id, user.vector, payload)
            return "success: transaction stats updated"
        except Exception as e:
            return f"error: {e}"


class FlagPriceHesitation(Tool):

    def execute(self, user_id: str, item_price: float, category: str = None, product_id: str = None):
        try:
            if helpers.is_null(user_id) or item_price is None:
                return "error: missing required params for FlagPriceHesitation"

            if helpers.is_null(category) and not helpers.is_null(product_id):
                 # Fetch product
                 try:
                    p_id = get_point_id(product_id)
                    res = config.qdrant.retrieve(
                        collection_name="products",
                        ids=[p_id],
                        with_payload=True
                    )
                    if res:
                        payload = res[0].payload
                        category = payload.get("category") or payload.get("metadata", {}).get("category")
                 except Exception as ex:
                    return f"error: failed to retrieve product {product_id}: {ex}"

            if helpers.is_null(category):
                return "error: category was null and could not be inferred"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            fin = payload.get("financials", {})
            cat_stats = fin.get("category_stats", {}).get(category)

            if cat_stats and cat_stats["avg_spend"] > 0:
                if item_price > (cat_stats["avg_spend"] * 1.2):
                    cat_stats["hesitation_count"] = cat_stats.get("hesitation_count", 0) + 1
                    fin["category_stats"][category] = cat_stats
                    payload["financials"] = fin
                    helpers.upsert_user(user_id, user.vector, payload)

            return "success: price hesitation processed"
        except Exception as e:
            return f"error: {e}"


class SetAspirationalBudget(Tool):

    def execute(self, user_id: str, category: str, min_budget: float, max_budget: float):
        try:
            if helpers.is_null(user_id) or helpers.is_null(category) or min_budget is None or max_budget is None:
                return "error: missing required params for SetAspirationalBudget"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload
            fin = payload.get("financials", {})

            fin.setdefault("category_stats", {})
            fin["category_stats"].setdefault(category, {"avg_spend": 0.0, "count": 0, "max_spend": 0.0})

            fin["category_stats"][category]["wishlist_budget_min"] = min_budget
            fin["category_stats"][category]["wishlist_budget_max"] = max_budget

            payload["financials"] = fin
            helpers.upsert_user(user_id, user.vector, payload)
            return "success: aspirational budget set"
        except Exception as e:
            return f"error: {e}"


class UpdateSeasonality(Tool):

    def execute(self, user_id: str, month: int):
        try:
            if helpers.is_null(user_id) or month is None:
                return "error: missing required params for UpdateSeasonality"

            user = helpers.get_user_point(user_id, with_vectors=True)
            payload = user.payload

            payload.setdefault("seasonality", {})
            active_months = set(payload["seasonality"].get("active_months", []))
            active_months.add(month)

            payload["seasonality"]["active_months"] = list(active_months)
            payload["seasonality"]["is_holiday_shopper"] = any(m in [11, 12, 1] for m in active_months)

            helpers.upsert_user(user_id, user.vector, payload)
            return "success: seasonality updated"
        except Exception as e:
            return f"error: {e}"


class SetActiveSearchIntent(Tool):

    def execute(self, user_id: str, raw_query: str, expanded_keywords: str, filters: dict):
        try:
            if helpers.is_null(user_id) or helpers.is_null(raw_query):
                return "error: missing required params for SetActiveSearchIntent"

            expanded_keywords = expanded_keywords or ""
            filters = filters or {}

            full_text = f"{raw_query} {expanded_keywords}".strip()
            vector = helpers.get_text_embedding(full_text)
            if vector is None:
                return "error: query text was null"

            config.qdrant.delete(
                collection_name="user_intents",
                points_selector=Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                        FieldCondition(key="type", match=MatchValue(value="active_search"))
                    ]
                )
            )

            intent_id = str(uuid.uuid4())
            config.qdrant.upsert(
                collection_name="user_intents",
                points=[PointStruct(
                    id=intent_id,
                    vector={"intent_vector": vector},
                    payload={
                        "user_id": user_id,
                        "type": "active_search",
                        "status": "active",
                        "query": raw_query,
                        "expanded_query": expanded_keywords,
                        "filters": filters,
                        "timestamp": datetime.now().isoformat()
                    }
                )]
            )
            return "success: active search intent set"
        except Exception as e:
            return f"error: {e}"


class AddPassiveWishlistIntent(Tool):

    def execute(self, user_id: str, product_desc: str, image_url: str, urgency_days: int, budget_min: float, budget_max: float):
        try:
            if helpers.is_null(user_id) or helpers.is_null(product_desc) or urgency_days is None or budget_min is None or budget_max is None:
                return "error: missing required params for AddPassiveWishlistIntent"

            text_vector = helpers.get_text_embedding(product_desc)
            if text_vector is None:
                return "error: product_desc was null"

            visual_vector = helpers.get_image_embedding(image_url)

            urgency_score = 1.0 / max(urgency_days, 1) if urgency_days is not None else 0.1

            # ✅ FIX: Keep uuid4() here since this is a NEW intent, not tied to user_id
            from uuid import uuid4
            intent_id = str(uuid4())

            vectors = {"intent_vector": text_vector}
            if visual_vector is not None:
                vectors["visual_vector"] = visual_vector

            config.qdrant.upsert(
                collection_name="user_intents",
                points=[PointStruct(
                    id=intent_id,
                    vector=vectors,
                    payload={
                        "user_id": user_id,
                        "type": "passive_wishlist",
                        "status": "active",
                        "product_desc": product_desc,
                        "has_image": bool(image_url),
                        "image_url": image_url,
                        "urgency_score": urgency_score,
                        "budget_min": budget_min,
                        "budget_max": budget_max,
                        "timestamp": datetime.now().isoformat()
                    }
                )]
            )
            return f"success: wishlist intent added ({intent_id})"
        except Exception as e:
            return f"error: {e}"


class FulfillIntent(Tool):

    def execute(self, user_id: str, product_id: str, category: str):
        try:
            if helpers.is_null(user_id) or helpers.is_null(product_id):
                return "error: missing required params for FulfillIntent"

            config.qdrant.set_payload(
                collection_name="user_intents",
                payload={"status": "fulfilled", "fulfilled_by": product_id},
                points=Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                        FieldCondition(key="status", match=MatchValue(value="active")),
                        FieldCondition(key="type", match=MatchValue(value="active_search"))
                    ]
                )
            )
            return "success: intent fulfilled"
        except Exception as e:
            return f"error: {e}"