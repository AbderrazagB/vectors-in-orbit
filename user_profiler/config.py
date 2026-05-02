import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

class Config:
    def __init__(self) -> None:
        self.embedding_service_url = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8000")
        self.qdrant_host = os.getenv("QDRANT_HOST", "localhost")
        self.qdrant_port = int(os.getenv("QDRANT_PORT", 6333))
        self.qdrant = QdrantClient(host=self.qdrant_host, port=self.qdrant_port)
        self.text_embed_dim = int(os.getenv("TEXT_EMBED_DIM", 1024))
        self.visual_embed_dim = int(os.getenv("VISUAL_EMBED_DIM", 512))

config = Config()
