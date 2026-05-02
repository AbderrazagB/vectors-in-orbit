from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel

class AddToCartEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    store_id: Optional[str] = None
    is_from_search: Optional[bool] = None

class PurchaseMadeEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    order_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    total_amount: Optional[float] = None
    discount_applied: Optional[float] = None
    payment_method: Optional[str] = None
    installment_plan: Optional[bool] = None
    coupon_code: Optional[str] = None
    store_id: Optional[str] = None
    is_from_wishlist: Optional[bool] = None
    is_from_search: Optional[bool] = None

class RemoveFromCartEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    reason: Optional[str] = None
    store_id: Optional[str] = None

class ReturnRefundEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    order_id: Optional[str] = None
    product_ids: Optional[List[str]] = None
    reason: Optional[str] = None
    refund_amount: Optional[float] = None
    currency: Optional[str] = None
    condition: Optional[str] = None
    days_since_purchase: Optional[int] = None

class ReviewSubmittedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    rating: Optional[float] = None
    review_text: Optional[str] = None

class ProductAddedEvent(BaseModel):
    product_id: Optional[str] = None
    timestamp: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    store_id: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    stock_quantity: Optional[int] = None
    discount: Optional[float] = None
    tags: Optional[List[str]] = None

class ProductUpdatedEvent(BaseModel):
    product_id: Optional[str] = None
    timestamp: Optional[str] = None
    updated_fields: Optional[List[str]] = None
    previous_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
