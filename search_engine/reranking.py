import numpy as np
import math
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class RerankingLayer:
    """
    LAYER 3: Context-Aware Multiplicative Scorer
    """

    def __init__(self):
        self.life_event_categories = {
            "Gaming Laptop Needed": ["Electronics", "Computers", "Laptops"], "Chuwi Laptop Needed": ["Electronics", "Computers", "Laptops"],
            "Ph.D. student simulations": ["Electronics", "Computers", "Laptops"], "Work from cafe": ["Electronics", "Bags", "Accessories", "Fashion"],
            "Baby Shower": ["Baby", "Kids", "Gifts"], "Baby": ["Baby", "Kids"], "Newborn": ["Baby", "Kids"], "1st birthday": ["Baby", "Kids", "Toys", "Gifts"],
            "baby gift": ["Baby", "Kids", "Gifts"], "nursery decoration": ["Baby", "Home Decor"], "Seminar Room Setup": ["Electronics", "Furniture", "Office"],
            "Winter Season": ["Clothing", "Fashion", "Outerwear"], "back to school": ["Electronics", "Bags", "Clothing", "Stationery"], "professional_artist": ["Electronics", "Art Supplies", "Design"]
        }
        self.trait_category_boost = {
            "Gamer": ["Electronics", "Gaming", "Computers"], "Tech Enthusiast": ["Electronics", "Gadgets", "Computers"],
            "Fashion Enthusiast": ["Clothing", "Fashion", "Accessories"], "Home Decor Enthusiast": ["Furniture", "Home Decor", "Decor"],
            "Parent": ["Baby", "Kids", "Toys"], "Runner": ["Sports", "Clothing", "Footwear"],
            "Business Traveler": ["Luggage", "Bags", "Travel"], "DIY Enthusiast": ["Tools", "Hardware", "Home Improvement"]
        }
        self.market_anchors = {
            "Electronics": 500.0, "Smartphones": 800.0, "Computers": 1500.0, "Laptops": 1500.0, "Gaming": 400.0,
            "Fashion": 80.0, "Clothing": 60.0, "Baby": 60.0, "Furniture": 400.0, "Accessories": 40.0
        }
        self.seasonal_tags = {
            "winter": ["thermal", "insulated", "warm", "padded", "fleece", "wool", "down", "puffer", "heavyweight", "cozy", "knit"],
            "summer": ["light", "breathable", "cotton", "linen", "shorts", "sandals", "tank", "sleeveless", "cooling"],
            "spring": ["lightweight", "transitional", "raincoat", "windbreaker"], "fall": ["layering", "cardigan", "hoodie", "medium-weight"]
        }
        self.query_seasonal_keywords = {
            "winter": ["winter", "hiver", "warm", "chaud", "cold", "froid"], "summer": ["summer", "été", "light", "léger", "hot", "beach"],
            "spring": ["spring", "printemps"], "fall": ["fall", "autumn", "automne"]
        }

    def safe_cosine(self, vec_a: Optional[List[float]], vec_b: Optional[List[float]]) -> float:
        if not vec_a or not vec_b: return 0.0
        a, b = np.array(vec_a), np.array(vec_b)
        n_a, n_b = np.linalg.norm(a), np.linalg.norm(b)
        return float(np.dot(a, b) / (n_a * n_b)) if n_a and n_b else 0.0

    def _detect_query_season(self, query: str) -> Optional[str]:
        for s, kws in self.query_seasonal_keywords.items():
            if any(kw in query.lower() for kw in kws): return s
        return None

    def _calculate_seasonal_multiplier(self, tags: List[str], query: str, user_active_months: List[int]) -> float:
        mult, detected = 1.0, self._detect_query_season(query)
        if detected and detected in self.seasonal_tags:
            matches = sum(1 for kw in self.seasonal_tags[detected] if kw in ' '.join([t.lower() for t in tags]))
            if matches > 0: mult *= (1.0 + min(matches * 0.2, 0.7))
        if user_active_months:
            curr = datetime.utcnow().month
            season_tags = self.seasonal_tags.get("winter") if curr in [12, 1, 2] else self.seasonal_tags.get("summer") if curr in [6, 7, 8] else self.seasonal_tags.get("spring") if curr in [3, 4, 5] else self.seasonal_tags.get("fall") if curr in [9, 10, 11] else None
            if season_tags and any(t in ' '.join([tag.lower() for tag in tags]) for t in season_tags): mult *= 1.2
        return min(mult, 2.0)

    def _calculate_life_event_multiplier(self, category: str, events: List[Dict[str, Any]]) -> float:
        if not events: return 1.0
        now, max_boost = datetime.utcnow(), 1.0
        for e in events:
            if (exp := e.get("expires_at")) and now > (expiry := datetime.fromisoformat(exp.replace('Z', '+00:00'))): continue
            if category in self.life_event_categories.get(e.get("event", ""), []):
                urgency = 1.5 if exp and (expiry - now).days <= 7 else 1.3 if exp and (expiry - now).days <= 30 else 1.0
                max_boost = max(max_boost, 2.5 * urgency)
        return max_boost

    def _calculate_negative_taste_multiplier(self, p_vec: Optional[List[float]], n_vec: Optional[List[float]]) -> float:
        if not p_vec or not n_vec: return 1.0
        return max(0.5, 1.0 - (((self.safe_cosine(p_vec, n_vec) + 1) / 2 - 0.7) / 0.3) * 0.5) if (self.safe_cosine(p_vec, n_vec) + 1) / 2 > 0.7 else 1.0

    def _calculate_dislike_penalty(self, p: Any, dislikes: List[str]) -> float:
        if not dislikes: return 1.0
        meta, reviews, soup = p.payload.get("metadata", {}), p.payload.get("review_data", {}), set()
        soup.update({meta.get("name", "").lower(), meta.get("brand", "").lower(), meta.get("category", "").lower()})
        soup.update(t.lower() for t in meta.get("tags", []) + reviews.get("extracted_tags", []))
        desc, penalty = meta.get("description", "").lower(), 1.0
        for d in [x.lower() for x in dislikes]:
             if ":" in d:
                 attr, val = map(str.strip, d.split(":", 1))
                 if attr == "brand" and meta.get("brand", "").lower() == val: penalty *= 0.5
                 elif attr == "quality" and val in soup: penalty *= 0.6
                 elif attr == "performance" and val in soup: penalty *= 0.6
                 elif attr == "price" and meta.get("name", "").lower() in val: penalty *= 0.7
             elif d in soup: penalty *= 0.7
             elif d in desc: penalty *= 0.8
        return max(0.3, penalty)

    def _calculate_wishlist_multiplier(self, p: Any, intents: List[Dict[str, Any]]) -> float:
        if not intents: return 1.0
        p_vecs, price, max_boost = getattr(p, "vector", {}) or {}, p.payload.get("metadata", {}).get("price", 0.0), 1.0
        for i in intents:
            i_vecs, i_load = i.get("vectors", {}) or {}, i.get("payload", {})
            if not i_load.get("budget_min", 0) * 0.7 <= price <= i_load.get("budget_max", float('inf')) * 1.3: continue
            text_sim = self.safe_cosine(i_vecs.get("intent_vector"), p_vecs.get("text_vector"))
            vis_sim = self.safe_cosine(i_vecs.get("visual_vector"), p_vecs.get("visual_vector")) if i_load.get("has_image") else 0.0
            comb_sim = ((vis_sim * 0.65 + text_sim * 0.35 if i_load.get("has_image") else text_sim) + 1) / 2
            if comb_sim >= 0.6: max_boost = max(max_boost, (1.0 + comb_sim * 0.8) * (1.0 + i_load.get("urgency_score", 0.0)))
        return min(max_boost, 3.5)

    def _calculate_brand_loyalty_multiplier(self, brand: str, affinity: Dict[str, float]) -> float:
        return min(1.0 + (math.log2(1 + affinity[brand]) / 4), 1.8) if brand in affinity else 1.0

    def _calculate_trait_category_multiplier(self, traits: List[str], cat: str, tags: List[str]) -> float:
        if not traits: return 1.0
        boost = 1.0
        for t in traits:
            if cat in self.trait_category_boost.get(t, []): boost *= 1.3
            if any(t.lower().replace("-", " ") in tag.lower() or tag.lower() in t.lower().replace("-", " ") for tag in tags): boost *= 1.2
        return min(boost, 2.0)

    def _calculate_budget_multiplier(self, price: float, cat: str, stats: Dict[str, Any], traits: List[str], intent: str) -> float:
        if intent == "specific_product" or price <= 0: return 1.0
        anchor = stats.get(cat, {}).get("wishlist_budget_max") or stats.get(cat, {}).get("avg_spend", 0)
        if anchor == 0: anchor = next((v for k, v in self.market_anchors.items() if k.lower() in cat.lower()), 100.0)
        safe = anchor * (2.0 if any(t in traits for t in ["High-Spender", "Brand-Loyal", "Tech-Savvy"]) else 1.1 if any(t in traits for t in ["Price-Sensitive", "Deal-Hunter", "Student"]) else 1.3)
        return 1.0 if price <= safe else max(0.1, math.exp(-(1.0 if safe/anchor == 2.0 else 3.0 if safe/anchor == 1.1 else 1.5) * (price/safe - 1)))

    def _calculate_market_quality_multiplier(self, p: Any, hesitations: int) -> float:
        stats, meta, mult = p.payload.get("stats", {}), p.payload.get("metadata", {}), 1.0
        if (pc := stats.get("purchase_count", 0)) > 5 and (stats.get("return_count", 0) / pc) > 0.15: mult *= (1.0 - (stats.get("return_count", 0) / pc) * 0.5)
        if meta.get("is_discounted") and (stats.get("hesitation_count", 0) > 3 or hesitations > 5): mult *= 1.3
        return mult * 1.1 if p.payload.get("scores", {}).get("desirability_score", 0.5) > 0.8 else mult

    def _get_cold_start_multipliers(self, p: Any, demog: Dict[str, Any]) -> float:
        meta, mult = p.payload.get("metadata", {}), 1.0
        try:
            age = int(demog.get("age", 0))
            if 18 <= age <= 25 and any(t in meta.get("tags", []) for t in ["trendy", "tech", "gaming"]): mult *= 1.3
            elif age >= 40 and meta.get("brand") in ["Apple", "Sony", "Samsung"]: mult *= 1.2
        except: pass
        if demog.get("gender") and meta.get("gender", "Unisex") != "Unisex" and demog.get("gender").upper() == meta.get("gender").upper()[0]: mult *= 1.1
        if demog.get("status") == "student" and meta.get("price", 0) < 200: mult *= 1.2
        elif demog.get("status") == "working" and p.payload.get("stats", {}).get("purchase_count", 0) > 10: mult *= 1.1
        return mult * (0.8 + p.payload.get("scores", {}).get("desirability_score", 0.5) * 0.4)

    def _generate_dynamic_reason(
        self, 
        meta: Dict[str, Any],
        multipliers: Dict[str, float],
        user_context: Dict[str, Any]
    ) -> str:
        
        if multipliers['wishlist'] > 1.8:
            return "Matches your wishlist preferences"
        
        if multipliers['life_event'] > 1.5:
            cat = meta.get("category", "")
            for event in user_context.get("life_events", []):
                if cat in self.life_event_categories.get(event.get("event", ""), []):
                    return f"Perfect for your '{event.get('event')}'"
            return "Timely for your upcoming plans"

        if multipliers['brand'] > 1.2:
            brand = meta.get("brand", "this brand")
            return f"Because you love {brand}"

        if multipliers['seasonal'] > 1.1:
            tags = meta.get("tags", [])
            for s, kws in self.seasonal_tags.items():
                if any(kw in ' '.join(tags).lower() for kw in kws):
                    return f"Ready for {s.capitalize()}?" if s == "fall" else f"Ready for {s.capitalize()}?" if s == "summer" else f"Essential for {s.capitalize()}"
            return "Great for the season"

        if multipliers['trait'] > 1.15:
            traits = user_context.get("traits", [])
            cat = meta.get("category", "")
            tags = meta.get("tags", [])
            for t in traits:
                if cat in self.trait_category_boost.get(t, []) or (t.lower() in str(tags).lower()):
                    return f"Picked for {t}s like you"
            return "Tailored to your interests"

        if meta.get("is_discounted"):
            return "Great Deal"
        
        desirability = multipliers.get('desirability_raw', 0.5)
        if desirability > 0.85:
            return "Highly Rated by community"
        
        fallbacks = [
            "Recommended for you",
            "Fits your style",
            "You might like this",
            "Curated selection"
        ]
        return random.choice(fallbacks)

    def rerank(self, candidates: List[Any], user_profile: Dict[str, Any], user_wishlist: List[Dict[str, Any]], query_text: str = "", top_n: int = 20) -> List[Dict[str, Any]]:
        if not candidates: return []
        load, demog = user_profile.get("payload", {}), user_profile.get("payload", {}).get("demographics", {})
        traits, dislikes = load.get("traits", []), load.get("dislikes", [])
        fin, prefs = load.get("financials", {}), load.get("preferences", {})
        is_cold = (not user_profile.get("vector", {}).get("long_term_taste") and fin.get("global_ltv", 0) == 0)
        
        results = []
        
        # Prepare context for the reason generator
        user_context_for_reason = {
            "life_events": load.get("life_events", []),
            "traits": traits
        }

        for c in sorted(candidates, key=lambda x: x.score, reverse=True)[:top_n]:
            meta, price, tags = c.payload.get("metadata", {}), c.payload.get("metadata", {}).get("price", 0.0), c.payload.get("metadata", {}).get("tags", []) + c.payload.get("review_data", {}).get("extracted_tags", [])
            base = c.score
            
            if is_cold:
                cmult = self._get_cold_start_multipliers(c, demog)
                results.append({
                    "product_id": str(c.id), 
                    "name": meta.get("name"), 
                    "price": price, 
                    "image_url": meta.get("image_url"), 
                    "match_reason": "🌟 Popular with new users", 
                    "scores": {"total": round(base * cmult * 10.0, 4), "base_relevance": round(base, 2), "cold_start_multiplier": round(cmult, 2)}, 
                    "payload": c.payload
                })
                continue
            
            # Calculate all multipliers individually
            life_event_mult = self._calculate_life_event_multiplier(meta.get("category", "general"), load.get("life_events", []))
            negative_mult = self._calculate_negative_taste_multiplier((getattr(c, "vector", {}) or {}).get("typical_user_vector"), user_profile.get("vector", {}).get("negative_taste"))
            dislike_mult = self._calculate_dislike_penalty(c, dislikes)
            wishlist_mult = self._calculate_wishlist_multiplier(c, user_wishlist)
            brand_mult = self._calculate_brand_loyalty_multiplier(meta.get("brand", ""), prefs.get("brand_affinity", {}))
            trait_mult = self._calculate_trait_category_multiplier(traits, meta.get("category", "general"), tags)
            seasonal_mult = self._calculate_seasonal_multiplier(tags, query_text, load.get("seasonality", {}).get("active_months", []))
            budget_mult = self._calculate_budget_multiplier(price, meta.get("category", "general"), fin.get("category_stats", {}), traits, c.payload.get('hybrid_debug', {}).get('intent', 'broad_explore'))
            market_mult = self._calculate_market_quality_multiplier(c, fin.get("hesitation_count", 0))

            # Combine
            context_multiplier = (
                life_event_mult * negative_mult * dislike_mult * wishlist_mult *
                brand_mult * trait_mult * seasonal_mult * budget_mult * market_mult
            )
            
            # Pack multipliers for reason generator
            multipliers_map = {
                "wishlist": wishlist_mult,
                "life_event": life_event_mult,
                "brand": brand_mult,
                "seasonal": seasonal_mult,
                "trait": trait_mult,
                "desirability_raw": c.payload.get("scores", {}).get("desirability_score", 0.5)
            }
            
            # Generate Dynamic Reason using actual data
            reason = self._generate_dynamic_reason(meta, multipliers_map, user_context_for_reason)

            results.append({
                "product_id": str(c.payload.get("product_id", c.id)), 
                "name": meta.get("name"), 
                "price": price, 
                "image_url": meta.get("image_url"), 
                "match_reason": reason, 
                "scores": {
                    "total": round(base * context_multiplier * 10.0, 4), 
                    "base_relevance": round(base, 2), 
                    "context_multiplier": round(context_multiplier, 2),
                    "budget_fit": round(budget_mult, 2)
                }, 
                "payload": c.payload
            })
            
        return sorted(results, key=lambda x: x["scores"]["total"], reverse=True)