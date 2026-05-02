# server.py
from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import datetime
import os

# --- NEW IMPORTS FOR QDRANT READ ---
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

# Import your existing event models
try:
    from .user_profiler.events import *
    from .kafka_broker import broker
    from .product_vectorizer.events import ProductAddedEvent, ProductUpdatedEvent
except ImportError:  # Allow running as a script
    import sys
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    from user_profiler.events import *
    from kafka_broker import broker
    from product_vectorizer.events import ProductAddedEvent, ProductUpdatedEvent

# --- QDRANT CONFIGURATION ---
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
# Initialize client for reading
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Wait for Kafka to be ready
    print("[INFO] Waiting 15 seconds for Kafka to be ready...")
    await asyncio.sleep(20)
    await broker.start()
    yield
    await broker.stop()

app = FastAPI(lifespan=lifespan)

# Allow CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW ENDPOINT: GET PRODUCTS BY CATEGORY ---
@app.get("/products/{category}")
async def get_products_by_category(category: str):
    """
    Returns 30 products matching the specific category from Qdrant.
    """
    try:
        # Create a filter to match the category field in metadata
        category_filter = Filter(
            must=[
                FieldCondition(
                    key="metadata.category",
                    match=MatchValue(value=category)
                )
            ]
        )

        # Scroll (fetch) products from the 'products' collection
        records, _ = qdrant_client.scroll(
            collection_name="products",
            scroll_filter=category_filter,
            limit=4,
            with_payload=True,
            with_vectors=False  # We don't need the vectors for display
        )

        if not records:
            return {"count": 0, "products": []}

        # Clean up the output format
        cleaned_products = []
        for record in records:
            # Directly use the payload from Qdrant
            product_data = record.payload
            
            # Ensure ID is included if missing in payload but present in record
            if "product_id" not in product_data:
                product_data["product_id"] = record.id

            cleaned_products.append(product_data)

        return {"count": len(cleaned_products), "products": cleaned_products}

    except Exception as e:
        print(f"Error fetching products: {e}")
        # Return empty list gracefully or raise HTTP error depending on preference
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# --- EXISTING PRODUCT MUTATIONS ---

@app.post("/products")
async def add_product(prod: dict):
    # Trigger Event for Product Vectorizer
    prod_id = prod.get("id", f"prod_{uuid.uuid4().hex[:8]}")
    
    event = ProductAddedEvent(
        timestamp=datetime.datetime.now().isoformat(),
        product_id=prod_id,
        name=prod.get("name", "Unknown"),
        description=prod.get("description", ""),
        image_url=prod.get("image", ""),
        category=prod.get("category", "General"),
        price=prod.get("price", 0.0),
        tags=prod.get("tags", [])
    )
    await broker.send_event("ProductAddedEvent", event.model_dump())
    
    return {"status": "sent", "product_id": prod_id}

@app.put("/products/{product_id}")
async def update_product(product_id: str, updates: dict):
    # Trigger Event
    event = ProductUpdatedEvent(
        timestamp=datetime.datetime.now().isoformat(),
        product_id=product_id,
        updated_fields=list(updates.keys()),
        **updates
    )
    await broker.send_event("ProductUpdatedEvent", event.model_dump())
    return {"status": "sent"}

# --- EVENT ENDPOINTS (TRIGGER KAFKA) ---

@app.post("/events/profile")
async def create_profile(event: ProfileCreatedEvent):
    # Enforce timestamp if missing
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("ProfileCreatedEvent", event.model_dump())
    return {"status": "sent"}


@app.post("/events/cart/add")
async def add_cart(event: AddToCartEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("AddToCartEvent", event.model_dump())
    return {"status": "sent"}

@app.post("/events/cart/remove")
async def remove_cart(event: RemoveFromCartEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("RemoveFromCartEvent", event.model_dump())
    return {"status": "sent"}

@app.post("/events/purchase")
async def purchase(event: PurchaseMadeEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    event.order_id = f"ord_{uuid.uuid4().hex[:8]}"
    await broker.send_event("PurchaseMadeEvent", event.model_dump())
    return {"status": "sent", "order_id": event.order_id}

@app.post("/events/wishlist")
async def wishlist_add(event: WishlistAddedEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("WishlistAddedEvent", event.model_dump())
    return {"status": "sent"}

@app.post("/events/review")
async def review_submit(event: ReviewSubmittedEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("ReviewSubmittedEvent", event.model_dump())
    return {"status": "sent"}

@app.post("/events/return")
async def return_refund(event: ReturnRefundEvent):
    if not event.timestamp: event.timestamp = datetime.datetime.now().isoformat()
    await broker.send_event("ReturnRefundEvent", event.model_dump())
    return {"status": "sent"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)