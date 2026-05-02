from rank_bm25 import BM25Okapi
import numpy as np, spacy
from typing import List, Dict, Any

class BM25Ranker:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1, self.b, self.bm25, self.product_ids, self.is_indexed = k1, b, None, [], False
        try: self.nlp = spacy.load("en_core_web_sm")
        except:
            from spacy.cli import download; download("en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")

    def preprocess(self, text: str) -> List[str]:
        return [t.lemma_ for t in self.nlp(text.lower()) if not t.is_stop and not t.is_punct and not t.is_space]

    def index_products(self, products: List[Dict[str, Any]]):
        if not products: return
        self.product_ids = []
        corpus = []
        for p in products:
            meta = p.get("metadata", p) if "metadata" in p else p
            name, brand, desc = meta.get("name", ""), meta.get("brand", ""), meta.get("description", "")
            tags = " ".join(meta.get("tags", []))
            doc_text = f"{name} {name} {name} {brand} {brand} {desc} {tags}"
            corpus.append(self.preprocess(doc_text))
            self.product_ids.append(p.get("id") or meta.get("product_id") or p.get("product_id"))
        self.bm25 = BM25Okapi(corpus, k1=self.k1, b=self.b)
        self.is_indexed = True

    def search(self, query: str, top_k: int = 50) -> List[Dict]:
        if not self.is_indexed: return []
        scores = self.bm25.get_scores(self.preprocess(query))
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [{"id": self.product_ids[i], "bm25_score": float(scores[i])} for i in top_indices if scores[i] > 0]