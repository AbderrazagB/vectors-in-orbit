from typing import Dict, Any
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range, MatchAny

class ConstraintLayer:
    @staticmethod
    def build_filters(explicit_filters: Dict[str, Any]) -> Filter:
        must, must_not = [FieldCondition(key="metadata.stock_quantity", range=Range(gt=0))], []
        req_cond = explicit_filters.get("condition", "new").lower()
        if req_cond not in ["used", "refurbished"]: must_not.append(FieldCondition(key="warnings.quality_flag", match=MatchValue(value=True)))
        if explicit_filters:
            for k, v in explicit_filters.items():
                if k == "category": must.append(FieldCondition(key=f"metadata.{k}", match=MatchAny(any=v)))
                elif k == "size": must.append(FieldCondition(key="metadata.tags", match=MatchValue(value=v)))
                elif k == "price_min": must.append(FieldCondition(key="metadata.price", range=Range(gte=v)))
                elif k == "price_max": must.append(FieldCondition(key="metadata.price", range=Range(lte=v)))
        return Filter(must=must, must_not=must_not)