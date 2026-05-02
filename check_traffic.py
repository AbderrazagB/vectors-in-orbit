from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchText, MatchValue, IsNull

# 1. Connect to your Azure IP
client = QdrantClient(host="20.199.86.40", port=6333)

print("Starting deletion process...")

# 2. Define the filter (OR logic)
batch_filter = Filter(
    should=[
        # Condition A: Contains "unsplash"
        FieldCondition(
            key="metadata.image_url", 
            match=MatchText(text="unsplash")
        ),
        # Condition B: Is an empty string ""
        FieldCondition(
            key="metadata.image_url", 
            match=MatchValue(value="")
        ),
        # Condition C: Is strictly None/Null
        FieldCondition(
            key="metadata.image_url", 
            is_null=IsNull(value=True)
        )
    ]
)

# 3. Execute deletion
result = client.delete(
    collection_name="products",
    points_selector=batch_filter
)

print(f"Operation status: {result.status}")
print("Cleanup complete.")