"""
Authentication and Authorization Module
Handles user registration, login, and JWT token management
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import secrets

# Security configuration
SECRET_KEY = secrets.token_urlsafe(32)  # Generate random secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """Token data model."""
    user_id: Optional[str] = None
    email: Optional[str] = None


class UserRegister(BaseModel):
    """User registration model."""
    email: EmailStr
    password: str
    name: str
    user_type: str = "customer"  # "customer" or "vendor"
    age: Optional[int] = None
    sex: Optional[str] = None  # "M" or "F"
    status: Optional[str] = None  # "working", "unemployed", "student", etc.
    region: Optional[str] = None
    # Vendor-specific fields
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None
    business_license: Optional[str] = None


class UserLogin(BaseModel):
    """User login model."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str
    user: dict


class AuthService:
    """Authentication service."""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.users_collection = db_connection.get_collection("users")
        self._create_indexes()
    
    def _create_indexes(self):
        """Create indexes for users collection."""
        # Drop old username index if it exists (we don't use usernames)
        try:
            self.users_collection.drop_index("username_1")
            print("Dropped old username index")
        except Exception:
            pass  # Index doesn't exist, that's fine
        
        # Unique index on email
        self.users_collection.create_index("email", unique=True)
        print("Created indexes for users collection")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash password."""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify JWT token and extract data."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            
            if user_id is None:
                return None
            
            return TokenData(user_id=user_id, email=email)
        except JWTError:
            return None
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email."""
        return self.users_collection.find_one({"email": email})
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        user = self.users_collection.find_one({"_id": user_id})
        if user:
            # Remove password from response
            user.pop("password_hash", None)
        return user
    
    def register_user(self, user_data: UserRegister) -> dict:
        """Register a new user."""
        # Check if user already exists
        if self.get_user_by_email(user_data.email):
            raise ValueError("Email already registered")
        
        # Validate user_type
        if user_data.user_type not in ["customer", "vendor"]:
            raise ValueError("Invalid user type. Must be 'customer' or 'vendor'")
        
        # For vendors, require shop_name
        if user_data.user_type == "vendor" and not user_data.shop_name:
            raise ValueError("Shop name is required for vendor registration")
        
        # Create user ID with type prefix
        prefix = "vendor" if user_data.user_type == "vendor" else "customer"
        user_id = f"{prefix}_{secrets.token_urlsafe(8)}"
        
        # Hash password
        password_hash = self.get_password_hash(user_data.password)
        
        # Create base user document
        user_doc = {
            "_id": user_id,
            "email": user_data.email,
            "password_hash": password_hash,
            "name": user_data.name,
            "user_type": user_data.user_type,
            "age": user_data.age,
            "sex": user_data.sex,
            "status": user_data.status,
            "region": user_data.region,
            "device": None,
            "ip_address": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Add vendor-specific fields
        if user_data.user_type == "vendor":
            user_doc.update({
                "shop_name": user_data.shop_name,
                "shop_description": user_data.shop_description,
                "business_license": user_data.business_license,
                "verified": False,  # Vendors need verification
                "products_count": 0,
                "total_sales": 0.0,
            })
        
        # Insert user
        self.users_collection.insert_one(user_doc)
        
        # Remove password from response
        user_doc.pop("password_hash")
        return user_doc
    
    def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate user with email and password."""
        user = self.get_user_by_email(email)
        if not user:
            return None
        
        if not self.verify_password(password, user["password_hash"]):
            return None
        
        # Remove password from response
        user.pop("password_hash")
        return user
    
    def login(self, login_data: UserLogin) -> Token:
        """Login user and return token."""
        user = self.authenticate_user(login_data.email, login_data.password)
        
        if not user:
            raise ValueError("Incorrect email or password")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={
                "sub": user["_id"], 
                "email": user["email"],
                "user_type": user.get("user_type", "customer")
            },
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
    
    def update_user_profile(self, user_id: str, updates: dict) -> bool:
        """Update user profile."""
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        # Remove sensitive fields from updates
        updates.pop("password_hash", None)
        updates.pop("_id", None)
        
        result = self.users_collection.update_one(
            {"_id": user_id},
            {"$set": updates}
        )
        
        return result.modified_count > 0
    
    def get_all_vendors(self, verified_only: bool = False) -> list:
        """Get all vendor users."""
        query = {"user_type": "vendor"}
        if verified_only:
            query["verified"] = True
        
        vendors = list(self.users_collection.find(query))
        # Remove passwords
        for vendor in vendors:
            vendor.pop("password_hash", None)
        return vendors
    
    def verify_vendor(self, user_id: str) -> bool:
        """Verify a vendor account."""
        result = self.users_collection.update_one(
            {"_id": user_id, "user_type": "vendor"},
            {"$set": {"verified": True, "updated_at": datetime.utcnow().isoformat()}}
        )
        return result.modified_count > 0
    
    def is_vendor(self, user_id: str) -> bool:
        """Check if user is a vendor."""
        user = self.users_collection.find_one({"_id": user_id})
        return user and user.get("user_type") == "vendor"
    
    def is_customer(self, user_id: str) -> bool:
        """Check if user is a customer."""
        user = self.users_collection.find_one({"_id": user_id})
        return user and user.get("user_type") == "customer"
