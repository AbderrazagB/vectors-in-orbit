"""
FastAPI Server for Nexus AI Store
Provides REST API endpoints for products, cart, and orders
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import sys
import os
import math
import datetime
import requests
import time
def post_with_retry(url, json, retries=5, delay=2):
    """POST with retry logic for internal service communication."""
    for attempt in range(retries):
        try:
            response = requests.post(url, json=json, timeout=5)
            response.raise_for_status()
            return response
        except Exception as e:
            if attempt < retries - 1:
                print(f"[WARN] POST to {url} failed (attempt {attempt+1}/{retries}): {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"[ERROR] POST to {url} failed after {retries} attempts: {e}")
                raise

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from services import ReviewService, WishlistService, CartService, OrderService, PurchaseService

# Import authentication
from auth import AuthService, UserRegister, UserLogin, Token, TokenData

# Import Kafka broker and events
from events import (
        AddToCartEvent, RemoveFromCartEvent, PurchaseMadeEvent,
        ProfileCreatedEvent, ReviewSubmittedEvent, WishlistAddedEvent,ReturnRefundEvent
    )

API_GATEWAY_URL = os.environ.get("API_GATEWAY_URL", "http://localhost:8008")


def clean_product_data(product: Dict[str, Any]) -> Dict[str, Any]:
    """Clean NaN and invalid values from product data for JSON serialization."""
    cleaned = {}
    for key, value in product.items():
        # Handle float NaN values
        if isinstance(value, float) and math.isnan(value):
            cleaned[key] = None
        # Handle string "nan" values
        elif isinstance(value, str) and value.lower() == 'nan':
            cleaned[key] = None
        else:
            cleaned[key] = value
    return cleaned




app = FastAPI(
    title="Nexus AI Store API",
    description="E-commerce API with Kafka event streaming",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
review_service = ReviewService()
wishlist_service = WishlistService()
cart_service = CartService()
order_service = OrderService()
purchase_service = PurchaseService()
auth_service = AuthService(review_service.mongo)


# Pydantic models for request/response
class CreateReviewRequest(BaseModel):
    product_id: str
    user_id: str
    user_name: str
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = ""
    comment: str
    verified_purchase: bool = False
    images: List[str] = []


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None
    images: Optional[List[str]] = None


class AddProductToWishlistRequest(BaseModel):
    user_id: str
    product_id: str
    product_name: str
    product_price: float
    product_image_url: str = ""
    notes: str = ""
    priority: int = Field(default=3, ge=1, le=5)
    which_least_priority: int = 0  # frontend field


class AddTextToWishlistRequest(BaseModel):
    user_id: str
    description: str
    wishlist_notes: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    urgency_days: Optional[int] = None
    desired_attributes: Optional[list[str]] = None
    image_url: Optional[str] = None


class AddTextWithImageToWishlistRequest(BaseModel):
    user_id: str
    description: str
    image_url: str
    notes: str = ""
    priority: int = Field(default=3, ge=1, le=5)
    which_least_priority: int = 0  # frontend field
    wishlist_notes: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    urgency_days: Optional[int] = None
    desired_attributes: Optional[list[str]] = None


class UpdateWishlistItemRequest(BaseModel):
    notes: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    description: Optional[str] = None
    image_url: Optional[str] = None
    which_least_priority: Optional[int] = None  # frontend field


class AddToCartRequest(BaseModel):
    user_id: str
    product_id: str
    product_name: str
    price: float
    image_url: str = ""
    quantity: int = 1
    is_from_search: bool = False


class UpdateCartItemRequest(BaseModel):
    user_id: str
    product_id: str
    quantity: int


class RemoveFromCartRequest(BaseModel):
    user_id: str
    product_id: str
    price: Optional[float] = None
    image_url: Optional[str] = None
    quantity: Optional[int] = 1


class ShippingAddress(BaseModel):
    street: str
    city: str
    state: str
    postal_code: str
    country: str


class CreateOrderRequest(BaseModel):
    user_id: str
    shipping_address: ShippingAddress
    payment_method: str = "credit_card"
    product_ids: Optional[List[str]] = None  # If None, purchases all cart items


class UpdateOrderStatusRequest(BaseModel):
    status: str


class UpdatePaymentStatusRequest(BaseModel):
    status: str


class AddTrackingNumberRequest(BaseModel):
    tracking_number: str


# Health check
@app.get("/")
async def root():
    return {
        "message": "Nexus AI Store API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Authentication endpoints
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user."""
    try:
        user = auth_service.register_user(user_data)
        
        # Publish ProfileCreatedEvent to Kafka
        try:
            event = ProfileCreatedEvent(
                    user_id=user["_id"],
                    timestamp=datetime.datetime.now().isoformat(),
                    session_id=f"session_{user['_id']}",
                    name=user["name"],
                    age=user.get("age"),
                    gender=user.get("sex"),  # Map sex to gender for event
                    region=user.get("region"),
                    status=user.get("status")
                )
            post_with_retry(f"{API_GATEWAY_URL}/events/profile", json=event.model_dump())
            print(f"✅ Sent ProfileCreatedEvent for user {user['_id']}")
        except Exception as e:
                print(f"❌ Failed to send ProfileCreatedEvent: {e}")
        
        # Auto-login after registration
        return auth_service.login(UserLogin(email=user_data.email, password=user_data.password))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    """Login user and get access token."""
    try:
        return auth_service.login(login_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/me")
async def get_current_user(authorization: str = Query(..., alias="Authorization")):
    """Get current user from token."""
    try:
        # Extract token from Authorization header
        token = authorization.replace("Bearer ", "")
        token_data = auth_service.verify_token(token)
        
        if not token_data or not token_data.user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = auth_service.get_user_by_id(token_data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication")


# Review endpoints
@app.get("/api/reviews/product/{product_id}")
async def get_product_reviews(
    product_id: str,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Get all reviews for a specific product."""
    try:
        reviews = review_service.get_reviews_by_product(product_id, limit, skip)
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reviews/product/{product_id}/stats")
async def get_product_review_stats(product_id: str):
    """Get review statistics for a product."""
    try:
        stats = review_service.get_review_stats(product_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reviews/user/{user_id}")
async def get_user_reviews(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Get all reviews by a specific user."""
    try:
        reviews = review_service.get_user_reviews(user_id, limit, skip)
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reviews/{review_id}")
async def get_review(review_id: str):
    """Get a specific review by ID."""
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@app.post("/api/reviews")
async def create_review(review: CreateReviewRequest):
    """Create a new product review."""
    try:
        review = review.dict()
        new_review = review_service.create_review(review)
        event = ReviewSubmittedEvent(
                user_id=review["user_id"],
                timestamp=datetime.datetime.now().isoformat(),
                session_id=f"session_{review['user_id']}",
                product_id=review["product_id"],
                rating=float(review["rating"]),
                review_text=review["comment"]  # Map comment to review_text field
            )
        post_with_retry(f"{API_GATEWAY_URL}/events/review", json=event.model_dump())
        print(f"✅ Sent ReviewSubmittedEvent (rating: {new_review['rating']}) for product {review['product_id']}")
        return new_review
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/reviews/{review_id}")
async def update_review(review_id: str, update_data: UpdateReviewRequest):
    """Update an existing review."""
    try:
        # Filter out None values
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        updated_review = review_service.update_review(review_id, update_dict)
        if not updated_review:
            raise HTTPException(status_code=404, detail="Review not found")
        return updated_review
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/reviews/{review_id}")
async def delete_review(review_id: str):
    """Delete a review."""
    try:
        success = review_service.delete_review(review_id)
        if not success:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"message": "Review deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str):
    """Mark a review as helpful."""
    try:
        success = review_service.mark_helpful(review_id)
        if not success:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"message": "Review marked as helpful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Wishlist endpoints
@app.get("/api/wishlist/{user_id}")
async def get_user_wishlist(
    user_id: str,
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    item_type: Optional[str] = Query(None, regex="^(product|text|text_with_image)$")
):
    """Get user's wishlist with optional filtering by type."""
    try:
        if item_type:
            wishlist = wishlist_service.get_wishlist_by_type(user_id, item_type)
        else:
            wishlist = wishlist_service.get_user_wishlist(user_id, limit, skip)
        return wishlist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wishlist/{user_id}/count")
async def get_wishlist_count(user_id: str):
    """Get total number of items in user's wishlist."""
    try:
        count = wishlist_service.get_wishlist_count(user_id)
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wishlist/item/{item_id}")
async def get_wishlist_item(item_id: str):
    """Get a specific wishlist item."""
    try:
        item = wishlist_service.get_wishlist_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        return item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/wishlist/add/product")
async def add_product_to_wishlist(request: AddProductToWishlistRequest):
    """Add a product to wishlist."""
    try:
        item = wishlist_service.add_product_to_wishlist(
            user_id=request.user_id,
            product_id=request.product_id,
            product_name=request.product_name,
            product_price=request.product_price,
            product_image_url=request.product_image_url,
            notes=request.notes,
            priority=request.priority,
            urgency_days=request.which_least_priority
        )
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/wishlist/add/text")
async def add_text_to_wishlist(request: AddTextToWishlistRequest):
    """Add a text-only item to wishlist."""
    try:
        print(request)
        item = wishlist_service.add_text_to_wishlist(
            user_id=request.user_id,
            description=request.description,
            notes=request.wishlist_notes,
            urgency_days=request.urgency_days,
            wishlist_notes=request.wishlist_notes,
            budget_min=request.budget_min,
            budget_max=request.budget_max,
            desired_attributes=request.desired_attributes,
            image_url=request.image_url
        )
        event= WishlistAddedEvent(
                user_id=request.user_id,
                timestamp=datetime.datetime.now().isoformat(),
                session_id=f"session_{request.user_id}",
                product_id=item['_id'],
                wishlist_id=item['_id'],
                wishlist_notes=request.wishlist_notes,
                budget_min=request.budget_min,
                budget_max=request.budget_max,
                urgency_days=request.urgency_days,
                desired_attributes=request.desired_attributes,
                description=request.description,
                image_url=request.image_url
            )
        post_with_retry(f"{API_GATEWAY_URL}/events/wishlist", json=event.model_dump())
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/wishlist/add/text-with-image")
async def add_text_with_image_to_wishlist(request: AddTextWithImageToWishlistRequest):
    """Add a text with image item to wishlist."""
    try:
        item = wishlist_service.add_text_with_image_to_wishlist(
            user_id=request.user_id,
            description=request.description,
            image_url=request.image_url,
            notes=request.notes,
            priority=request.priority,
            urgency_days=request.urgency_days or request.which_least_priority,
            wishlist_notes=request.wishlist_notes,
            budget_min=request.budget_min,
            budget_max=request.budget_max,
            desired_attributes=request.desired_attributes
        )
        event = WishlistAddedEvent(
                user_id=request.user_id,
                timestamp=datetime.datetime.now().isoformat(),
                session_id=f"session_{request.user_id}",
                product_id=item['_id'],
                wishlist_id=item['_id'],
                wishlist_notes=request.wishlist_notes,
                budget_min=request.budget_min,
                budget_max=request.budget_max,
                urgency_days=request.urgency_days or request.which_least_priority,
                desired_attributes=request.desired_attributes,
                description=request.description,
                image_url=request.image_url
            )
        post_with_retry(f"{API_GATEWAY_URL}/events/wishlist", json=event.model_dump())
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/wishlist/item/{item_id}")
async def update_wishlist_item(item_id: str, update_data: UpdateWishlistItemRequest):
    """Update a wishlist item."""
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        updated_item = wishlist_service.update_wishlist_item(item_id, update_dict)
        if not updated_item:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        return updated_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/wishlist/item/{item_id}")
async def delete_wishlist_item(item_id: str):
    """Delete a wishlist item."""
    try:
        success = wishlist_service.delete_wishlist_item(item_id)
        if not success:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        return {"message": "Wishlist item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/wishlist/{user_id}/clear")
async def clear_wishlist(user_id: str):
    """Clear all items from user's wishlist."""
    try:
        success = wishlist_service.clear_user_wishlist(user_id)
        return {"message": f"Cleared wishlist for user {user_id}", "success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Cart endpoints
@app.get("/api/cart/{user_id}")
async def get_cart(user_id: str):
    """Get user's shopping cart."""
    try:
        cart = cart_service.get_cart(user_id)
        return cart
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cart/add")
async def add_to_cart(request: AddToCartRequest):
    """Add item to cart. Product details must come from Qdrant."""
    try:
        cart = cart_service.add_item(
            user_id=request.user_id,
            product_id=request.product_id,
            product_name=request.product_name,
            price=request.price,
            image_url=request.image_url,
            quantity=request.quantity,
            is_from_search=request.is_from_search
        )
        
        # Publish Kafka event
        try:
            event = AddToCartEvent(
                    user_id=request.user_id,
                    timestamp=datetime.datetime.now().isoformat(),
                    session_id=f"session_{request.user_id}",
                    product_id=request.product_id,
                    quantity=request.quantity,
                    price=request.price,
                    currency='TND',
                    store_id='unknown'  # Can be passed in request if needed
                )
            post_with_retry(f"{API_GATEWAY_URL}/events/cart/add", json=event.model_dump())
            print(f"✅ Sent AddToCartEvent for product {request.product_id}")
        except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"❌ Failed to send AddToCartEvent: {e}")
        
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cart/update")
async def update_cart_item(request: UpdateCartItemRequest):
    """Update item quantity in cart."""
    try:
        cart = cart_service.update_item_quantity(
            request.user_id,
            request.product_id,
            request.quantity
        )
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cart/remove")
async def remove_from_cart(request: RemoveFromCartRequest):
    """Remove item from cart."""
    try:
        print(request)
        cart = cart_service.remove_item(request.user_id, request.product_id)
        print("aaaaaaaaaaaaaaaaa")
        event = RemoveFromCartEvent(
                    user_id=request.user_id,
                    timestamp=datetime.datetime.now().isoformat(),
                    session_id=f"session_{request.user_id}",
                    product_id=request.product_id,
                    quantity=1,
                    price=request.price,
                    currency='TND',
                    reason='Item Removed by User',
                )
        post_with_retry(f"{API_GATEWAY_URL}/events/cart/remove", json=event.model_dump())
        
        return cart
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cart/{user_id}/clear")
async def clear_cart(user_id: str):
    """Clear all items from cart."""
    try:
        cart = cart_service.clear_cart(user_id)
        return cart
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Order endpoints
@app.post("/api/orders/create")
async def create_order(request: CreateOrderRequest):
    """Create a new order from cart items."""
    try:
        order = order_service.create_order(
            request.user_id,
            request.shipping_address.dict(),
            request.payment_method,
            request.product_ids
        )
        
        # Publish Kafka events for each item purchased
        for item in order.get('items', []):
            event = PurchaseMadeEvent(
                    user_id=request.user_id,
                    timestamp=datetime.datetime.now().isoformat(),
                    session_id=f"session_{request.user_id}",
                    order_id=order.get('_id'),
                    product_id=item.get('product_id'),
                    quantity=item.get('quantity'),
                    price=item.get('price'),
                    currency='TND',
                    total_amount=order.get('total_amount'),
                    payment_method=request.payment_method,
                    store_id=item.get('vendor')
                )
            post_with_retry(f"{API_GATEWAY_URL}/events/purchase", json=event.model_dump())
        
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Get order details."""
    order = order_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.get("/api/orders/user/{user_id}")
async def get_user_orders(user_id: str):
    """Get all orders for a user."""
    try:
        orders = order_service.get_user_orders(user_id)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, request: UpdateOrderStatusRequest):
    """Update order status."""
    try:
        success = order_service.update_order_status(order_id, request.status)
        if not success:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Order status updated", "status": request.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/orders/{order_id}/payment")
async def update_payment_status(order_id: str, request: UpdatePaymentStatusRequest):
    """Update payment status."""
    try:
        success = order_service.update_payment_status(order_id, request.status)
        if not success:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Payment status updated", "status": request.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/orders/{order_id}/tracking")
async def add_tracking_number(order_id: str, request: AddTrackingNumberRequest):
    """Add tracking number to order."""
    try:
        success = order_service.add_tracking_number(order_id, request.tracking_number)
        if not success:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Tracking number added", "tracking_number": request.tracking_number}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/events/review-submit")
async def review_submit_event(
    product_id: str,
    user_id: str,
    rating: int,
    comment: Optional[str] = None
):
    """Track review submission event."""
    try:
        event = ReviewSubmittedEvent(
                user_id=user_id,
                timestamp=datetime.datetime.now().isoformat(),
                session_id=f"session_{user_id}",
                product_id=product_id,
                rating=float(rating),
                review_text=comment  # Map comment to review_text field
            )
        post_with_retry(f"{API_GATEWAY_URL}/events/review", json=event.model_dump())
        print(f"✅ Sent ReviewSubmittedEvent (rating: {rating}) for product {product_id}")
    except Exception as e:
            print(f"❌ Failed to send ReviewSubmittedEvent: {e}")
    return {"status": "sent"}




# ===== Purchase Endpoints =====

class ReturnPurchaseRequest(BaseModel):
    reason: str = "Customer return"


class CreatePurchaseRequest(BaseModel):
    user_id: str
    order_id: str
    product_id: str
    product_name: str
    quantity: int
    price: float
    currency: str = "TND"
    discount_applied: float = 0.0
    payment_method: str = "credit_card"
    installment_plan: bool = False
    coupon_code: Optional[str] = None
    store_id: Optional[str] = None
    is_from_wishlist: bool = False
    is_from_search: bool = False


@app.post("/api/purchases")
async def create_purchase(request: CreatePurchaseRequest):
    """Create a purchase record and send PurchaseMadeEvent to Kafka."""
    try:
        result = purchase_service.create_purchase(
            user_id=request.user_id,
            order_id=request.order_id,
            product_id=request.product_id,
            product_name=request.product_name,
            quantity=request.quantity,
            price=request.price,
            currency=request.currency,
            discount_applied=request.discount_applied,
            payment_method=request.payment_method,
            installment_plan=request.installment_plan,
            coupon_code=request.coupon_code,
            store_id=request.store_id,
            is_from_wishlist=request.is_from_wishlist,
            is_from_search=request.is_from_search
        )
        
       
        return result["purchase"]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/purchases/{purchase_id}/return")
async def return_purchase(purchase_id: str, request: ReturnPurchaseRequest):
    """Return a purchase and send ReturnRefundEvent to Kafka."""
    try:
        result = purchase_service.return_purchase(purchase_id, request.reason)
        

        event = ReturnRefundEvent(**result["kafka_event"])
        post_with_retry(f"{API_GATEWAY_URL}/events/return", json=event.model_dump())

        print(f"✅ Sent ReturnRefundEvent for purchase {purchase_id}")
    except Exception as e:
        print(f"❌ Failed to send ReturnRefundEvent: {e}")
        
        return result["purchase"]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/purchases/user/{user_id}")
async def get_user_purchases(
    user_id: str,
    status: Optional[str] = Query(None, description="Filter by status: purchased or returned")
):
    """Get all purchases for a user."""
    purchases = purchase_service.get_user_purchases(user_id, status)
    return {"purchases": purchases, "count": len(purchases)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)