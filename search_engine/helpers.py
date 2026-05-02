from typing import List
from qdrant_client import QdrantClient
from .config import Config
from .embedding_client import EmbeddingClient

class SearchHelpers:
    def __init__(self, config: Config):
        self.config = config
        self.qdrant = QdrantClient(host=config.qdrant_host, port=config.qdrant_port)
        
        # Initialize the API Client
        self.embed_client = EmbeddingClient(config.embedding_service_url)

    def get_text_embedding(self, text: str) -> List[float]:
        if not text: return [0.0] * self.config.text_embed_dim
        return self.embed_client.get_text_embedding(text)

    def get_clip_text_embedding(self, text: str) -> List[float]:
        if not text: return [0.0] * self.config.visual_embed_dim
        return self.embed_client.get_clip_text_embedding(text)

    def get_clip_image_embedding(self, image_url: str) -> List[float]:
        if not image_url: return [0.0] * self.config.visual_embed_dim
        return self.embed_client.get_image_embedding(image_url)