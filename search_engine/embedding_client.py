import os
import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class EmbeddingClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def _post(self, endpoint: str, payload: Dict[str, Any]) -> Any:
        try:
            url = f"{self.base_url}{endpoint}"
            # Short timeout to ensure search doesn't hang forever if embedding service is slow
            response = requests.post(url, json=payload, timeout=5)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Embedding Service Error ({url}): {e}")
            return None

    def get_text_embedding(self, text: str) -> List[float]:
        res = self._post("/embed/text", {"text": text})
        # Return 1024 zeros if failed (Matches BGE-M3)
        return res["embedding"] if res else [0.0] * 1024 

    def get_image_embedding(self, image_url: str) -> List[float]:
        res = self._post("/embed/image", {"image_url": image_url})
        # Return 512 zeros if failed (Matches CLIP)
        return res["embedding"] if res else [0.0] * 512

    def get_clip_text_embedding(self, text: str) -> List[float]:
        res = self._post("/embed/clip_text", {"text": text})
        # Return 512 zeros if failed (Matches CLIP)
        return res["embedding"] if res else [0.0] * 512

    def predict_intent(self, query: str, labels: List[str]) -> Dict[str, Any]:
        res = self._post("/predict/intent", {"query": query, "labels": labels})
        return res if res else {"labels": labels, "scores": [0.0] * len(labels)}