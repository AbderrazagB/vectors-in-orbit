"""
Script to populate MongoDB users from Qdrant user profiles.
Extracts demographics and generates credentials for MongoDB storage.

Designed to run non-interactively during Docker container startup.
Idempotent: skips if MongoDB already has users.
"""

import asyncio
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from passlib.context import CryptContext

# Handle imports for both direct execution and Docker module execution
try:
    from mongo_backend.db_connection import MongoDBConnection
    from mongo_backend.config import COLLECTIONS
except ImportError:
    try:
        from db_connection import MongoDBConnection
        from config import COLLECTIONS
    except ImportError:
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from db_connection import MongoDBConnection
        from config import COLLECTIONS


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Qdrant connection — configurable via env vars for Docker networking
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
USERS_COLLECTION = "users"  # Default Qdrant collection name

# Retry settings for waiting on Qdrant readiness
QDRANT_MAX_RETRIES = int(os.getenv("QDRANT_MAX_RETRIES", "15"))
QDRANT_RETRY_DELAY = int(os.getenv("QDRANT_RETRY_DELAY", "5"))


def get_qdrant_client() -> QdrantClient:
    """Initialize Qdrant client with retry logic."""
    for attempt in range(1, QDRANT_MAX_RETRIES + 1):
        try:
            client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=10)
            # Test connectivity by listing collections
            collections = client.get_collections()
            print(f"[hydrate] Connected to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}")
            print(f"[hydrate] Available collections: {[c.name for c in collections.collections]}")
            return client
        except Exception as e:
            if attempt < QDRANT_MAX_RETRIES:
                print(f"[hydrate] Qdrant not ready (attempt {attempt}/{QDRANT_MAX_RETRIES}): {e}")
                print(f"[hydrate] Retrying in {QDRANT_RETRY_DELAY}s...")
                time.sleep(QDRANT_RETRY_DELAY)
            else:
                print(f"[hydrate] ERROR: Could not connect to Qdrant after {QDRANT_MAX_RETRIES} attempts.")
                raise


def extract_user_data(qdrant_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract relevant user data from Qdrant payload.
    
    Qdrant structure:
    {
        "user_id": "user_walid_eng",
        "demographics": {
            "age": "32",
            "gender": "M",
            "region": "Ariana",
            "status": "working",
            "device": "Linux Desktop"
        },
        ...
    }
    
    Returns MongoDB-ready user data (without credentials)
    """
    demographics = qdrant_payload.get("demographics", {})
    
    # Extract and normalize data
    user_id = qdrant_payload.get("user_id", "")
    age = demographics.get("age", "")
    gender = demographics.get("gender", "").upper()
    region = demographics.get("region", "")
    status = demographics.get("status", "")
    device = demographics.get("device", "")
    
    # Convert age to int if possible
    try:
        age_int = int(age) if age else None
    except (ValueError, TypeError):
        age_int = None
    
    # Normalize gender to M/F
    sex = "M" if gender == "M" else "F" if gender == "F" else None
    
    return {
        "user_id": user_id,
        "age": age_int,
        "sex": sex,
        "region": region,
        "status": status,
        "device": device
    }


def generate_email(user_id: str) -> str:
    """Generate email in format user1@gmail.com, user2@gmail.com, etc."""
    return f"{user_id}@gmail.com"


def create_mongo_user(user_data: Dict[str, Any], email: str, password: str = "123456") -> Dict[str, Any]:
    """
    Create complete MongoDB user document with credentials.
    
    Args:
        user_data: Extracted user data from Qdrant
        email: Generated email
        password: Plain text password (will be hashed)
    
    Returns:
        Complete MongoDB user document
    """
    user_id = user_data.get("user_id", "")
    
    # Hash password
    password_hash = pwd_context.hash(password)
    
    # Create MongoDB document
    now = datetime.utcnow().isoformat()
    
    return {
        "_id": user_id,  # Use Qdrant user_id as MongoDB _id
        "username": user_id,
        "email": email,
        "password_hash": password_hash,
        "first_name": "",  # Not available from Qdrant
        "last_name": "",   # Not available from Qdrant
        "age": user_data.get("age"),
        "sex": user_data.get("sex"),
        "status": user_data.get("status"),
        "region": user_data.get("region"),
        "device": user_data.get("device"),
        "address": {
            "street": "",
            "city": user_data.get("region", ""),  # Use region as city
            "state": "",
            "postal_code": "",
            "country": "Tunisia",  # Assuming Tunisia based on regions
        },
        "phone": "",
        "created_at": now,
        "updated_at": now,
    }


async def fetch_users_from_qdrant(client: QdrantClient, collection_name: str = USERS_COLLECTION, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Fetch all users from Qdrant collection.
    
    Args:
        client: QdrantClient instance
        collection_name: Name of the Qdrant collection
        limit: Maximum number of users to fetch (None for all)
    
    Returns:
        List of user payloads
    """
    users = []
    offset = None
    batch_size = 100
    
    print(f"[hydrate] Fetching users from Qdrant collection: {collection_name}")
    
    while True:
        # Scroll through all points
        result = client.scroll(
            collection_name=collection_name,
            limit=batch_size,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )
        
        points, next_offset = result
        
        if not points:
            break
        
        # Extract payloads
        for point in points:
            users.append(point.payload)
        
        print(f"[hydrate] Fetched {len(users)} users so far...")
        
        # Check if we've reached the limit
        if limit and len(users) >= limit:
            users = users[:limit]
            break
        
        # Check if there are more points
        if next_offset is None:
            break
        
        offset = next_offset
    
    print(f"[hydrate] Total users fetched: {len(users)}")
    return users


async def populate_users(qdrant_collection: str = USERS_COLLECTION, limit: Optional[int] = None):
    """
    Main function to populate MongoDB with users from Qdrant.
    Non-interactive — uses defaults and runs to completion.
    
    Args:
        qdrant_collection: Name of Qdrant collection containing users
        limit: Maximum number of users to import (None for all)
    """
    # Connect to MongoDB first to check if users already exist
    print("[hydrate] Connecting to MongoDB...")
    mongo = MongoDBConnection()
    mongo.connect()
    collection = mongo.get_collection(COLLECTIONS["users"])
    
    # Idempotency check: skip if users already exist
    existing_count = collection.count_documents({})
    if existing_count > 0:
        print(f"[hydrate] MongoDB already has {existing_count} users — skipping hydration.")
        mongo.close()
        return
    
    # Connect to Qdrant
    print(f"[hydrate] Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = get_qdrant_client()
    
    # Check if the users collection exists in Qdrant
    try:
        client.get_collection(qdrant_collection)
    except (UnexpectedResponse, Exception) as e:
        print(f"[hydrate] WARNING: Qdrant collection '{qdrant_collection}' not found: {e}")
        print("[hydrate] Skipping hydration — no users collection in Qdrant.")
        mongo.close()
        return
    
    # Fetch users from Qdrant
    qdrant_users = await fetch_users_from_qdrant(client, qdrant_collection, limit)
    
    if not qdrant_users:
        print("[hydrate] No users found in Qdrant")
        mongo.close()
        return
    
    # Process each user
    mongo_users = []
    skipped_users = []
    
    for qdrant_user in qdrant_users:
        try:
            # Extract user data
            user_data = extract_user_data(qdrant_user)
            
            # Skip if no user_id
            if not user_data.get("user_id"):
                skipped_users.append("No user_id")
                continue
            
            # Generate email
            email = generate_email(user_data.get("user_id"))
            
            # Create MongoDB document
            mongo_user = create_mongo_user(user_data, email)
            mongo_users.append(mongo_user)
            
        except Exception as e:
            skipped_users.append(f"Error: {str(e)}")
            continue
    
    print(f"\n{'='*60}")
    print(f"Processed {len(qdrant_users)} users from Qdrant")
    print(f"Ready to import: {len(mongo_users)} users")
    print(f"Skipped: {len(skipped_users)} users")
    print(f"{'='*60}\n")
    
    if skipped_users:
        print("Skipped users:")
        for reason in skipped_users[:10]:  # Show first 10
            print(f"  - {reason}")
        if len(skipped_users) > 10:
            print(f"  ... and {len(skipped_users) - 10} more")
        print()
    
    # Insert into MongoDB
    if not mongo_users:
        print("[hydrate] No users to insert")
        mongo.close()
        return
    
    print("[hydrate] Inserting users into MongoDB...")
    
    inserted_count = 0
    duplicate_count = 0
    error_count = 0
    
    for user in mongo_users:
        try:
            # Check if user already exists
            existing = collection.find_one({"_id": user["_id"]})
            if existing:
                duplicate_count += 1
                continue
            
            # Insert user
            collection.insert_one(user)
            inserted_count += 1
            
        except Exception as e:
            error_count += 1
            print(f"  ✗ Error inserting {user.get('username', 'unknown')}: {e}")
    
    print(f"\n{'='*60}")
    print(f"Import complete!")
    print(f"  Inserted: {inserted_count} users")
    print(f"  Duplicates: {duplicate_count} users")
    print(f"  Errors: {error_count} users")
    print(f"{'='*60}\n")
    print("All users have password: 123456")
    
    mongo.close()


if __name__ == "__main__":
    asyncio.run(populate_users())
