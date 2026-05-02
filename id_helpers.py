"""
ID Conversion Helpers for Qdrant Compatibility

Qdrant accepts UUIDs as point IDs. This module provides deterministic
conversion from human-readable string IDs to UUIDs using UUID5.

UUID5 guarantees:
- Same input always gives same UUID
- Valid UUID format for Qdrant
- Namespace isolation
"""

import uuid
from typing import Union

# Namespace for our application (you can change this to any UUID)
NAMESPACE = uuid.NAMESPACE_DNS

def string_to_uuid(string_id: str) -> str:
    """
    Convert a string ID to a deterministic UUID string.
    
    Uses UUID5 (SHA-1 based) to ensure same input always produces
    the same UUID. This is required for Qdrant compatibility.
    
    Args:
        string_id: Human-readable ID like "user_gamer" or "prod_laptop"
    
    Returns:
        UUID string suitable for Qdrant point ID
    
    Example:
        >>> string_to_uuid("user_gamer")
        '12345678-1234-5678-1234-567812345678'
        >>> string_to_uuid("user_gamer")  # Always the same
        '12345678-1234-5678-1234-567812345678'
    """
    return str(uuid.uuid5(NAMESPACE, string_id))


def uuid_to_string(uuid_str: str, prefix: str = "") -> str:
    """
    This is a helper for reverse lookups if needed.
    However, since UUID5 is one-way, you should store the
    original ID in the payload.
    
    Args:
        uuid_str: UUID string
        prefix: Optional prefix to help identify the type
    
    Returns:
        Just returns the UUID (can't reverse it)
    """
    return uuid_str


def get_point_id(human_id: str) -> str:
    """
    Get Qdrant-compatible point ID (UUID) from human-readable ID.
    
    Alias for string_to_uuid with clearer semantic meaning.
    """
    return string_to_uuid(human_id)


# Test the function
if __name__ == "__main__":
    test_ids = [
        "user_gamer",
        "user_student", 
        "user_mom",
        "prod_gaming_laptop",
        "prod_diapers",
        "prod_4k_tv"
    ]
    
    print("=" * 80)
    print("ID Conversion Test (String → UUID)")
    print("=" * 80)
    for test_id in test_ids:
        uuid_id = get_point_id(test_id)
        print(f"{test_id:<25} → {uuid_id}")
    
    # Test consistency
    print("\n" + "=" * 80)
    print("Consistency Test (same input = same UUID)")
    print("=" * 80)
    test = "user_gamer"
    uuid1 = get_point_id(test)
    uuid2 = get_point_id(test)
    print(f"Call 1: {uuid1}")
    print(f"Call 2: {uuid2}")
    print(f"Match: {uuid1 == uuid2}")
    
    print("\n" + "=" * 80)
    print("💡 IMPORTANT: Store original ID in payload!")
    print("=" * 80)
    print("Since UUIDs are one-way, always store the original ID:")
    print("  payload = {")
    print("    'original_id': 'user_gamer',  # ← Store this!")
    print("    'user_id': 'user_gamer',")
    print("    ...")
    print("  }")