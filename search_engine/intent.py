import spacy
from .config import Config
from .embedding_client import EmbeddingClient

class IntentEngine:
    def __init__(self):
        self.config = Config()
        self.embed_client = EmbeddingClient(self.config.embedding_service_url)
        
        # Keep Spacy for simple extraction (It is fast and CPU friendly)
        try: 
            self.nlp = spacy.load("en_core_web_sm")
        except:
            from spacy.cli import download; download("en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
            
        self.brand_patterns = ["samsung", "apple", "nike", "dell", "hp", "sony", "lenovo", "asus", "wacom", "msi", "redragon", "logitech"]
        self.labels = ["specific product search", "broad category exploration"]

    def extract_entities(self, query: str) -> dict:
        doc = self.nlp(query.lower())
        entities = {"brand": None, "has_alphanumeric": False}
        for token in [t.text for t in doc]:
             if token in self.brand_patterns: entities["brand"] = token
        if any(c.isdigit() for c in query): entities["has_alphanumeric"] = True
        return entities

    def predict_intent(self, query: str) -> dict:
        entities = self.extract_entities(query)
        intent_type = "broad_explore"
        confidence = 0.0

        # 1. Try Remote Model
        try:
            result = self.embed_client.predict_intent(query, self.labels)
            if result and result.get('labels'):
                top_label = result['labels'][0]
                if top_label == "specific product search":
                    intent_type = "specific_product"
                confidence = result['scores'][0]
        except Exception:
            pass 

        # 2. Rule-based Override
        if entities.get("brand") and entities.get("has_alphanumeric"):
            intent_type = "specific_product"
            confidence = 0.95
            
        return {"intent_type": intent_type, "confidence": confidence}