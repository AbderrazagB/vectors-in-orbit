"""
MongoDB Data Models
Defines the schema for collections
"""

from datetime import datetime
from typing import List, Optional, Dict, Any


class ReviewModel:
    """Product review schema."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # Unique review ID
            "product_id": str,  # ID of the product being reviewed
            "user_id": str,  # ID of the user who wrote the review
            "user_name": str,  # Name of the reviewer
            "rating": int,  # Rating from 1-5
            "title": str,  # Review title
            "comment": str,  # Review text
            "verified_purchase": bool,  # Whether user purchased the product
            "helpful_count": int,  # Number of users who found review helpful
            "images": List[str],  # Optional review images
            "created_at": str,
            "updated_at": str,
        }


class WishlistModel:
    """Wishlist item schema - can be product, text, or text with image."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # Unique wishlist item ID
            "user_id": str,  # Owner of the wishlist
            "item_type": str,  # "product", "text", or "text_with_image"
            # For product type
            "product_id": Optional[str],  # Product ID from Qdrant
            "product_name": Optional[str],
            "product_price": Optional[float],
            "product_image_url": Optional[str],
            # For text and text_with_image types
            "image_url": Optional[str],  # User-provided image URL
            # Common fields
            "notes": Optional[str],  # User's personal notes
            "priority": int,  # 1-5, user-defined priority
            "wishlist_notes": Optional[str],
            "budget_min": Optional[float],
            "budget_max": Optional[float],
            "urgency_days": Optional[int],
            "desired_attributes": Optional[list[str]],
            "description": Optional[str],
            "image_url": Optional[str],
            "created_at": str,
            "updated_at": str,
        }


class UserModel:
    """User schema."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # User ID
            "username": str,
            "email": str,
            "password_hash": str,
            "first_name": str,
            "last_name": str,
            "age": Optional[int],  # User's age
            "sex": Optional[str],  # "M" or "F"
            "status": Optional[str],  # "working", "unemployed", "student", etc.
            "address": {
                "street": str,
                "city": str,
                "state": str,
                "postal_code": str,
                "country": str,
            },
            "phone": str,
            "created_at": str,
            "updated_at": str,
        }


class CartModel:
    """Shopping cart schema."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # Cart ID
            "user_id": str,
            "items": [
                {
                    "product_id": str,
                    "product_name": str,
                    "price": float,
                    "quantity": int,
                    "image_url": str,
                    "added_at": str,
                }
            ],
            "total_amount": float,
            "created_at": str,
            "updated_at": str,
        }


class OrderModel:
    """Order schema."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # Order ID
            "user_id": str,
            "items": [
                {
                    "product_id": str,
                    "product_name": str,
                    "price": float,
                    "quantity": int,
                    "image_url": str,
                }
            ],
            "total_amount": float,
            "shipping_address": {
                "street": str,
                "city": str,
                "state": str,
                "postal_code": str,
                "country": str,
            },
            "payment_method": str,
            "payment_status": str,  # pending, completed, failed
            "order_status": str,  # pending, processing, shipped, delivered, cancelled
            "order_date": str,
            "updated_at": str,
            "tracking_number": Optional[str],
        }


class PurchaseModel:
    """Purchase schema - individual product purchases from orders."""
    
    @staticmethod
    def schema() -> Dict[str, Any]:
        return {
            "_id": str,  # Unique purchase ID
            "user_id": str,  # User who made the purchase
            "order_id": str,  # Associated order ID
            "product_id": str,  # Product purchased
            "product_name": str,
            "quantity": int,
            "price": float,  # Price per unit
            "total_amount": float,  # price * quantity
            "currency": str,
            "discount_applied": float,
            "payment_method": str,
            "installment_plan": bool,
            "coupon_code": Optional[str],
            "store_id": Optional[str],
            "is_from_wishlist": bool,
            "is_from_search": bool,
            "purchase_date": str,
            "status": str,  # "purchased" or "returned"
            "return_date": Optional[str],  # Date when returned
            "return_reason": Optional[str],  # Reason for return
            "created_at": str,
            "updated_at": str,
        }


# Validation helpers
def validate_review(review: Dict[str, Any]) -> bool:
    """Validate review data."""
    required_fields = ["product_id", "user_id", "user_name", "rating", "comment"]
    if not all(field in review for field in required_fields):
        return False
    # Validate rating is between 1-5
    if not (1 <= review.get("rating", 0) <= 5):
        return False
    return True


def validate_wishlist(wishlist: Dict[str, Any]) -> bool:
    """Validate wishlist data."""
    required_fields = ["user_id", "item_type"]
    if not all(field in wishlist for field in required_fields):
        return False
    
    item_type = wishlist.get("item_type")
    if item_type not in ["product", "text", "text_with_image"]:
        return False
    
    # Type-specific validation
    if item_type == "product":
        if not all(field in wishlist for field in ["product_id", "product_name", "product_price"]):
            return False
    elif item_type == "text":
        if "description" not in wishlist or not wishlist["description"]:
            return False
    elif item_type == "text_with_image":
        if not all(field in wishlist for field in ["description", "image_url"]):
            return False
    
    return True


def validate_cart_item(item: Dict[str, Any]) -> bool:
    """Validate cart item data."""
    required_fields = ["product_id", "product_name", "price", "quantity"]
    return all(field in item for field in required_fields)


def validate_order(order: Dict[str, Any]) -> bool:
    """Validate order data."""
    required_fields = ["user_id", "items", "total_amount", "shipping_address"]
    return all(field in order for field in required_fields)


def validate_purchase(purchase: Dict[str, Any]) -> bool:
    """Validate purchase data."""
    required_fields = ["user_id", "order_id", "product_id", "product_name", "quantity", "price", "total_amount"]
    return all(field in purchase for field in required_fields)
