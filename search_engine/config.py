import os
from pydantic_settings import BaseSettings

class Config(BaseSettings):
    # Service Connections
    qdrant_host: str = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port: int = int(os.getenv("QDRANT_PORT", 6333))
    # This URL comes from Docker Compose
    embedding_service_url: str = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8000")
    
    # Dimensions
    text_embed_dim: int = int(os.getenv("TEXT_EMBED_DIM", 1024))
    visual_embed_dim: int = int(os.getenv("VISUAL_EMBED_DIM", 512))
    
    weight_semantic: float = 0.5
    weight_price: float = 0.15
    weight_collaborative: float = 0.25
    weight_wishlist: float = 0.1
    default_purchasing_power: float = 500.0

    class Config:
        env_file = ".env"
        extra = "ignore"