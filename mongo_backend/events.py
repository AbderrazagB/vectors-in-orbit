from pydantic import BaseModel
from typing import *

class AddToCartEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    store_id: Optional[str] = None

class FilterAppliedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class ProfileCreatedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    name: Optional[str] = None
    device: Optional[str] = None
    status: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal["M", "F"]] = None
    region: Optional[str] = None
    ip_address: Optional[str] = None

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

class ProfileUpdatedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    updated_fields: Optional[List[str]] = None
    previous_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    device: Optional[str] = None
    region: Optional[str] = None
    ip_address: Optional[str] = None

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

class SearchPerformedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    query: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class WishlistAddedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    wishlist_id: Optional[str] = None
    wishlist_notes: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    urgency_days: Optional[int] = None
    desired_attributes: Optional[list[str]] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class WishlistRemovedEvent(BaseModel):
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    item_description: Optional[str] = None