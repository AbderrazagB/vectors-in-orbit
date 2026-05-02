"""
API Service Layer
Handles business logic for reviews, carts, orders, and wishlists
"""

from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime
from db_connection import MongoDBConnection
from config import COLLECTIONS
from models import validate_review, validate_wishlist, validate_cart_item, validate_order


class ReviewService:
    """Service for product review operations."""
    
    def __init__(self):
        self.mongo = MongoDBConnection()
        self.mongo.connect()
        self.collection = self.mongo.get_collection(COLLECTIONS["reviews"])
    
    def get_reviews_by_product(self, product_id: str, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all reviews for a specific product."""
        return list(self.collection.find({"product_id": product_id})
                   .sort("created_at", -1)
                   .skip(skip)
                   .limit(limit))
    
    def get_review_stats(self, product_id: str) -> Dict[str, Any]:
        """Get review statistics for a product."""
        reviews = list(self.collection.find({"product_id": product_id}))
        if not reviews:
            return {
                "total_reviews": 0,
                "average_rating": 0.0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }
        
        total = len(reviews)
        avg_rating = sum(r["rating"] for r in reviews) / total
        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            distribution[review["rating"]] += 1
        
        return {
            "total_reviews": total,
            "average_rating": round(avg_rating, 2),
            "rating_distribution": distribution
        }
    
    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific review by ID."""
        return self.collection.find_one({"_id": review_id})
    
    def get_user_reviews(self, user_id: str, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all reviews by a specific user."""
        return list(self.collection.find({"user_id": user_id})
                   .sort("created_at", -1)
                   .skip(skip)
                   .limit(limit))
    
    def create_review(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new review."""
        if not validate_review(review_data):
            raise ValueError("Invalid review data")
        
        # Check if user already reviewed this product
        existing = self.collection.find_one({
            "product_id": review_data["product_id"],
            "user_id": review_data["user_id"]
        })
        if existing:
            raise ValueError("User has already reviewed this product")
        
        review = {
            "_id": f"review_{uuid.uuid4().hex[:12]}",
            "product_id": review_data["product_id"],
            "user_id": review_data["user_id"],
            "user_name": review_data["user_name"],
            "rating": review_data["rating"],
            "title": review_data.get("title", ""),
            "comment": review_data["comment"],
            "verified_purchase": review_data.get("verified_purchase", False),
            "helpful_count": 0,
            "images": review_data.get("images", []),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        self.collection.insert_one(review)
        return review
    
    def update_review(self, review_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing review."""
        allowed_fields = ["rating", "title", "comment", "images"]
        update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
        update_fields["updated_at"] = datetime.now().isoformat()
        
        result = self.collection.update_one(
            {"_id": review_id},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            return self.get_review_by_id(review_id)
        return None
    
    def delete_review(self, review_id: str) -> bool:
        """Delete a review."""
        result = self.collection.delete_one({"_id": review_id})
        return result.deleted_count > 0
    
    def mark_helpful(self, review_id: str) -> bool:
        """Increment helpful count for a review."""
        result = self.collection.update_one(
            {"_id": review_id},
            {"$inc": {"helpful_count": 1}}
        )
        return result.modified_count > 0


class WishlistService:
    """Service for wishlist operations."""
    
    def __init__(self):
        self.mongo = MongoDBConnection()
        self.mongo.connect()
        self.collection = self.mongo.get_collection(COLLECTIONS["wishlists"])
    
    def get_user_wishlist(self, user_id: str, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all wishlist items for a user."""
        return list(self.collection.find({"user_id": user_id})
                   .sort("created_at", -1)
                   .skip(skip)
                   .limit(limit))
    
    def get_wishlist_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific wishlist item by ID."""
        return self.collection.find_one({"_id": item_id})
    
    def add_product_to_wishlist(self, user_id: str, product_id: str, product_name: str, 
                                product_price: float, product_image_url: str = "", 
                                notes: str = "", priority: int = 3, urgency_days: int = 0) -> Dict[str, Any]:
        """Add a product from Qdrant to wishlist."""
        wishlist_item = {
            "_id": f"wish_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "item_type": "product",
            "product_id": product_id,
            "product_name": product_name,
            "product_price": product_price,
            "product_image_url": product_image_url,
                # removed text_description, use description only
            "image_url": None,
            "notes": notes,
            "priority": priority,
            "urgency_days": urgency_days,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        if not validate_wishlist(wishlist_item):
            raise ValueError("Invalid wishlist data")
        
        # Check if product already in wishlist
        existing = self.collection.find_one({
            "user_id": user_id,
            "item_type": "product",
            "product_id": product_id
        })
        if existing:
            raise ValueError("Product already in wishlist")
        
        self.collection.insert_one(wishlist_item)
        return wishlist_item
    
    def add_text_to_wishlist(self, user_id: str, description: str, 
                            notes: str = "", urgency_days: int = 0, wishlist_notes: Optional[str] = None, budget_min: Optional[float] = None, budget_max: Optional[float] = None, desired_attributes: Optional[list[str]] = None, image_url: Optional[str] = None) -> Dict[str, Any]:
        """Add a text-only item to wishlist."""
        wishlist_item = {
            "_id": f"wish_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "item_type": "text",
            "product_id": None,
            "product_name": None,
            "product_price": None,
            "product_image_url": None,
            "description": description,
            "image_url": image_url,
            "notes": notes,
            "wishlist_notes": wishlist_notes,
            "budget_min": budget_min,
            "budget_max": budget_max,
            "urgency_days": urgency_days,
            "desired_attributes": desired_attributes,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        if not validate_wishlist(wishlist_item):
            raise ValueError("Invalid wishlist data")
        
        self.collection.insert_one(wishlist_item)
        return wishlist_item
    
    def add_text_with_image_to_wishlist(self, user_id: str, description: str, 
                                       image_url: str, notes: str = "", 
                                       priority: int = 3, urgency_days: int = 0, wishlist_notes: Optional[str] = None, budget_min: Optional[float] = None, budget_max: Optional[float] = None, desired_attributes: Optional[list[str]] = None) -> Dict[str, Any]:
        """Add a text with image item to wishlist."""
        wishlist_item = {
            "_id": f"wish_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "item_type": "text_with_image",
            "product_id": None,
            "product_name": None,
            "product_price": None,
            "product_image_url": None,
            "description": description,
            "image_url": image_url,
            "notes": notes,
            "wishlist_notes": wishlist_notes,
            "budget_min": budget_min,
            "budget_max": budget_max,
            "urgency_days": urgency_days,
            "desired_attributes": desired_attributes,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        if not validate_wishlist(wishlist_item):
            raise ValueError("Invalid wishlist data")
        
        self.collection.insert_one(wishlist_item)
        return wishlist_item
    
    def update_wishlist_item(self, item_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a wishlist item (notes, priority, text, image)."""
        allowed_fields = ["notes", "priority", "description", "image_url", "urgency_days", "wishlist_notes", "budget_min", "budget_max", "desired_attributes"]
        update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not update_fields:
            return None
        
        update_fields["updated_at"] = datetime.now().isoformat()
        
        result = self.collection.update_one(
            {"_id": item_id},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            return self.get_wishlist_item(item_id)
        return None
    
    def delete_wishlist_item(self, item_id: str) -> bool:
        """Delete a wishlist item."""
        result = self.collection.delete_one({"_id": item_id})
        return result.deleted_count > 0
    
    def clear_user_wishlist(self, user_id: str) -> bool:
        """Clear all items from user's wishlist."""
        result = self.collection.delete_many({"user_id": user_id})
        return result.deleted_count > 0
    
    def get_wishlist_count(self, user_id: str) -> int:
        """Get total number of items in user's wishlist."""
        return self.collection.count_documents({"user_id": user_id})
    
    def get_wishlist_by_type(self, user_id: str, item_type: str) -> List[Dict[str, Any]]:
        """Get wishlist items filtered by type."""
        if item_type not in ["product", "text", "text_with_image"]:
            return []
        return list(self.collection.find({"user_id": user_id, "item_type": item_type})
                   .sort("created_at", -1))


class CartService:
    """Service for cart operations."""
    
    def __init__(self):
        self.mongo = MongoDBConnection()
        self.mongo.connect()
        self.collection = self.mongo.get_collection(COLLECTIONS["carts"])
    
    def get_cart(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's cart."""
        cart = self.collection.find_one({"user_id": user_id})
        if not cart:
            # Create new cart
            cart = self._create_cart(user_id)
        return cart
    
    def _create_cart(self, user_id: str) -> Dict[str, Any]:
        """Create a new cart for user."""
        cart = {
            "_id": f"cart_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "items": [],
            "total_amount": 0.0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        self.collection.insert_one(cart)
        return cart
    
    def add_item(self, user_id: str, product_id: str, product_name: str, price: float, 
                 image_url: str = "", quantity: int = 1, is_from_search: bool = False) -> Dict[str, Any]:
        """Add item to cart. Product details must be provided from Qdrant."""
        # Get or create cart
        cart = self.get_cart(user_id)
        
        # Check if item already exists in cart
        item_exists = False
        for item in cart["items"]:
            if item["product_id"] == product_id:
                item["quantity"] += quantity
                item_exists = True
                break
        
        # Add new item if it doesn't exist
        if not item_exists:
            new_item = {
                "product_id": product_id,
                "product_name": product_name,
                "price": price,
                "quantity": quantity,
                "image_url": image_url,
                "is_from_search": is_from_search,
                "added_at": datetime.now().isoformat(),
            }
            cart["items"].append(new_item)
        
        # Recalculate total
        cart["total_amount"] = sum(item["price"] * item["quantity"] for item in cart["items"])
        cart["updated_at"] = datetime.now().isoformat()
        
        # Update in database
        self.collection.update_one(
            {"_id": cart["_id"]},
            {"$set": cart}
        )
        
        return cart
    
    def update_item_quantity(self, user_id: str, product_id: str, quantity: int) -> Dict[str, Any]:
        """Update item quantity in cart."""
        cart = self.get_cart(user_id)
        
        if quantity <= 0:
            return self.remove_item(user_id, product_id)
        
        # Find and update item
        for item in cart["items"]:
            if item["product_id"] == product_id:
                item["quantity"] = quantity
                break
        
        # Recalculate total
        cart["total_amount"] = sum(item["price"] * item["quantity"] for item in cart["items"])
        cart["updated_at"] = datetime.now().isoformat()
        
        # Update in database
        self.collection.update_one(
            {"_id": cart["_id"]},
            {"$set": cart}
        )
        
        return cart
    
    def remove_item(self, user_id: str, product_id: str) -> Dict[str, Any]:
        """Remove item from cart."""
        cart = self.get_cart(user_id)
        
        # Remove item
        cart["items"] = [item for item in cart["items"] if item["product_id"] != product_id]
        
        # Recalculate total
        cart["total_amount"] = sum(item["price"] * item["quantity"] for item in cart["items"])
        cart["updated_at"] = datetime.now().isoformat()
        
        # Update in database
        self.collection.update_one(
            {"_id": cart["_id"]},
            {"$set": cart}
        )
        
        return cart
    
    def clear_cart(self, user_id: str) -> Dict[str, Any]:
        """Clear all items from cart."""
        cart = self.get_cart(user_id)
        cart["items"] = []
        cart["total_amount"] = 0.0
        cart["updated_at"] = datetime.now().isoformat()
        
        self.collection.update_one(
            {"_id": cart["_id"]},
            {"$set": cart}
        )
        
        return cart


class OrderService:
    """Service for order operations."""
    
    def __init__(self):
        self.mongo = MongoDBConnection()
        self.mongo.connect()
        self.collection = self.mongo.get_collection(COLLECTIONS["orders"])
        self.cart_service = CartService()
    
    def create_order(
        self,
        user_id: str,
        shipping_address: Dict[str, str],
        payment_method: str = "credit_card",
        product_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create order from cart items.
        
        Args:
            user_id: User ID
            shipping_address: Shipping address
            payment_method: Payment method
            product_ids: Optional list of product IDs to purchase. If None, purchases all cart items.
        
        Note: Stock validation should be handled by the frontend/Qdrant layer
        since products are no longer in MongoDB.
        """
        # Get cart
        cart = self.cart_service.get_cart(user_id)
        
        if not cart["items"]:
            raise ValueError("Cart is empty")
        
        # Filter items to purchase
        if product_ids:
            items_to_purchase = [item for item in cart["items"] if item["product_id"] in product_ids]
            if not items_to_purchase:
                raise ValueError("No matching items found in cart")
        else:
            # If no product_ids specified, purchase all items
            items_to_purchase = cart["items"]
        
        # Calculate total for selected items
        order_total = sum(item["price"] * item["quantity"] for item in items_to_purchase)
        
        # Create order
        order = {
            "_id": f"order_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "items": items_to_purchase,
            "total_amount": order_total,
            "shipping_address": shipping_address,
            "payment_method": payment_method,
            "payment_status": "pending",
            "order_status": "pending",
            "order_date": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "tracking_number": None,
        }
        
        # Insert order
        self.collection.insert_one(order)
        
        # Remove only the purchased items from cart
        for item in items_to_purchase:
            self.cart_service.remove_item(user_id, item["product_id"])
        
        return order
    
    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get order by ID."""
        return self.collection.find_one({"_id": order_id})
    
    def get_user_orders(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all orders for a user."""
        return list(self.collection.find({"user_id": user_id}).sort("order_date", -1))
    
    def update_order_status(self, order_id: str, status: str) -> bool:
        """Update order status."""
        valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        
        result = self.collection.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "order_status": status,
                    "updated_at": datetime.now().isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    def update_payment_status(self, order_id: str, status: str) -> bool:
        """Update payment status."""
        valid_statuses = ["pending", "completed", "failed"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        
        result = self.collection.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "payment_status": status,
                    "updated_at": datetime.now().isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    def add_tracking_number(self, order_id: str, tracking_number: str) -> bool:
        """Add tracking number to order."""
        result = self.collection.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "tracking_number": tracking_number,
                    "order_status": "shipped",
                    "updated_at": datetime.now().isoformat()
                }
            }
        )
        return result.modified_count > 0


class PurchaseService:
    """Service for purchase operations with Kafka event emission."""
    
    def __init__(self):
        self.mongo = MongoDBConnection()
        self.mongo.connect()
        self.collection = self.mongo.get_collection(COLLECTIONS["purchases"])
    
    def create_purchase(
        self,
        user_id: str,
        order_id: str,
        product_id: str,
        product_name: str,
        quantity: int,
        price: float,
        currency: str = "TND",
        discount_applied: float = 0.0,
        payment_method: str = "credit_card",
        installment_plan: bool = False,
        coupon_code: Optional[str] = None,
        store_id: Optional[str] = None,
        is_from_wishlist: bool = False,
        is_from_search: bool = False
    ) -> Dict[str, Any]:
        """Create a purchase record.
        
        This should be called when an order is completed/paid.
        Returns the purchase document and Kafka event data.
        """
        total_amount = (price * quantity) - discount_applied
        now = datetime.now().isoformat()
        
        purchase = {
            "_id": f"purchase_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "order_id": order_id,
            "product_id": product_id,
            "product_name": product_name,
            "quantity": quantity,
            "price": price,
            "total_amount": total_amount,
            "currency": currency,
            "discount_applied": discount_applied,
            "payment_method": payment_method,
            "installment_plan": installment_plan,
            "coupon_code": coupon_code,
            "store_id": store_id,
            "is_from_wishlist": is_from_wishlist,
            "is_from_search": is_from_search,
            "purchase_date": now,
            "status": "purchased",
            "return_date": None,
            "created_at": now,
            "updated_at": now,
        }
        
        # Insert purchase
        self.collection.insert_one(purchase)
        
        # Prepare Kafka event
        kafka_event = {
            "user_id": user_id,
            "timestamp": now,
            "session_id": None,  # Can be passed if available
            "order_id": order_id,
            "product_id": product_id,
            "quantity": quantity,
            "price": price,
            "currency": currency,
            "total_amount": total_amount,
            "discount_applied": discount_applied,
            "payment_method": payment_method,
            "installment_plan": installment_plan,
            "coupon_code": coupon_code,
            "store_id": store_id,
            "is_from_wishlist": is_from_wishlist,
            "is_from_search": is_from_search,
        }
        
        return {"purchase": purchase, "kafka_event": kafka_event}
    
    def return_purchase(self, purchase_id: str, reason: str = "Customer return") -> Dict[str, Any]:
        """Return a purchase (simple refund).
        
        Args:
            purchase_id: Purchase ID to return
            reason: Reason for return
        
        Returns the updated purchase and Kafka event data.
        """
        purchase = self.collection.find_one({"_id": purchase_id})
        if not purchase:
            raise ValueError(f"Purchase {purchase_id} not found")
        
        if purchase["status"] == "returned":
            raise ValueError("Purchase already returned")
        
        # Calculate days since purchase
        purchase_date = datetime.fromisoformat(purchase["purchase_date"])
        days_since_purchase = (datetime.now() - purchase_date).days
        
        now = datetime.now().isoformat()
        
        # Update purchase status
        self.collection.update_one(
            {"_id": purchase_id},
            {
                "$set": {
                    "status": "returned",
                    "return_date": now,
                    "return_reason": reason,
                    "updated_at": now
                }
            }
        )
        
        # Get updated purchase
        updated_purchase = self.collection.find_one({"_id": purchase_id})
        
        # Prepare Kafka event
        kafka_event = {
            "user_id": purchase["user_id"],
            "timestamp": now,
            "session_id": None,
            "order_id": purchase["order_id"],
            "product_ids": [purchase["product_id"]],
            "reason": reason,
            "refund_amount": purchase["total_amount"],
            "currency": purchase["currency"],
            "condition": None,
            "days_since_purchase": days_since_purchase,
        }
        
        return {"purchase": updated_purchase, "kafka_event": kafka_event}
    
    def get_purchase(self, purchase_id: str) -> Optional[Dict[str, Any]]:
        """Get purchase by ID."""
        return self.collection.find_one({"_id": purchase_id})
    
    def get_user_purchases(
        self, 
        user_id: str, 
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all purchases for a user, optionally filtered by status."""
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        return list(self.collection.find(query).sort("purchase_date", -1))
    
    def get_product_purchases(self, product_id: str) -> List[Dict[str, Any]]:
        """Get all purchases for a specific product."""
        return list(self.collection.find({"product_id": product_id}).sort("purchase_date", -1))
    
    def get_order_purchases(self, order_id: str) -> List[Dict[str, Any]]:
        """Get all purchases from a specific order."""
        return list(self.collection.find({"order_id": order_id}))
