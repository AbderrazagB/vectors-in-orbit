import os
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

import litellm
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from product_vectorizer.events import *
from product_vectorizer.tools import (
    ensure_product_collections,
    UpsertProductProfile,
    EvolveTypicalUser,
    TrackInteraction,
    LogReviewInsights,
    ProcessReturnImpact,
)

# ------------------------------------------------------------------
# ENV & LOGGING
# ------------------------------------------------------------------

load_dotenv(override=True)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

api_key = os.getenv("MISTRAL_API_KEY","")
if not api_key:
    logger.warning("MISTRAL_API_KEY is not set")
else:
    os.environ["MISTRAL_API_KEY"] = api_key
    litellm.api_key = api_key


def log_pre_call(kwargs):
    logger.info("LLM call start | model=%s", kwargs.get("model"))


def log_post_call(kwargs, response, start, end):
    usage = response.get("usage", {}) if response else {}
    logger.info(
        "LLM call end | %.2fs | tokens=%s",
        end - start,
        usage.get("total_tokens", "?"),
    )


litellm.input_callback = [log_pre_call]
litellm.success_callback = [log_post_call]

# ------------------------------------------------------------------
# MODEL
# ------------------------------------------------------------------

llm = LiteLlm(model="mistral/mistral-large-latest")

# ------------------------------------------------------------------
# STORAGE INIT
# ------------------------------------------------------------------

ensure_product_collections()

# ------------------------------------------------------------------
# TOOL INSTANCES
# ------------------------------------------------------------------

upsert_profile_tool = UpsertProductProfile()
evolve_user_tool = EvolveTypicalUser()
track_interaction_tool = TrackInteraction()
log_review_tool = LogReviewInsights()
process_return_tool = ProcessReturnImpact()

# ------------------------------------------------------------------
# TOOL WRAPPERS WITH DOCSTRINGS (CRITICAL FOR AGENT)
# ------------------------------------------------------------------

def upsert_product_profile(
    product_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    image_url: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    gender: Optional[str] = None,
    condition: Optional[str] = None,
    price: Optional[float] = None,
    stock_quantity: Optional[int] = None,
    region: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_discounted: Optional[bool] = None,
):
    """
    Creates or updates a product profile in the Vector Database (Qdrant).
    
    Use this for 'ProductAddedEvent' or 'ProductUpdatedEvent'.
    Supports partial updates: if a field is None, it will not overwrite existing data.
    
    Args:
        product_id: Unique identifier for the product (Required).
        name: The display name of the product.
        description: Full text description.
        image_url: URL to the product image (triggers visual vector generation).
        category: Taxonomy category (e.g., "Electronics/Cameras").
        brand: Brand name (e.g., "Sony", "Nike").
        gender: Target demographic (e.g., "Men", "Women", "Unisex").
        condition: Product state (e.g., "New", "Used", "Refurbished").
        price: Current price.
        stock_quantity: Available inventory count.
        region: Geographic availability (e.g., "US", "EU").
        tags: List of keywords or tags associated with the product.
        is_discounted: Boolean flag indicating if the product is on sale.
    """
    return upsert_profile_tool.execute(
        product_id,
        name,
        description,
        image_url,
        category,
        brand,
        gender,
        condition,
        price,
        stock_quantity,
        region,
        tags,
        is_discounted,
    )


def evolve_typical_user(product_id: str, user_id: str):
    """
    Updates the product's 'Typical User Vector' based on a confirmed purchase.
    
    This mathematically blends the buyer's long-term taste vector into the 
    product's vector, allowing the product to "learn" who buys it.
    
    Args:
        product_id: The ID of the product purchased.
        user_id: The ID of the user who bought it.
    """
    return evolve_user_tool.execute(product_id, user_id)


def track_interaction(product_id: str, interaction_type: str, desirability_delta: float):
    """
    Updates engagement statistics and the global 'Desirability Score' of a product.
    
    Args:
        product_id: The ID of the product.
        interaction_type: One of ['add', 'buy', 'remove', 'hesitation', 'view'].
        desirability_delta: A float value to adjust the score (Range: -1.0 to 1.0).
                            Examples:
                            - Buy: +0.5
                            - Add to Cart: +0.2
                            - Remove from Cart: -0.15
                            - Return: -0.3
    """
    return track_interaction_tool.execute(
        product_id, interaction_type, desirability_delta
    )


def log_review_insights(
    product_id: str,
    sentiment_score: float,
    extracted_tags: List[str],
    is_quality_issue: bool,
):
    """
    Processes a text review to update semantic tags and quality flags.
    
    Args:
        product_id: The ID of the product.
        sentiment_score: Float between -1.0 (Negative) and 1.0 (Positive).
        extracted_tags: List of short noun-phrases extracted from the text (e.g., ["battery life", "lens quality"]).
        is_quality_issue: Set to True if the text mentions defects, damage, or breaking.
    """
    return log_review_tool.execute(
        product_id, sentiment_score, extracted_tags, is_quality_issue
    )


def process_return_impact(
    product_id: str, user_id: str, is_taste_mismatch: bool
):
    """
    Handles the negative signal of a product return.
    
    Args:
        product_id: The ID of the product.
        user_id: The user returning the item.
        is_taste_mismatch: If True, it implies the product vector misled the user (e.g., "didn't like style").
                           If False, it implies a defect or price issue (not a vector mismatch).
    """
    return process_return_tool.execute(
        product_id, user_id, is_taste_mismatch
    )


tool_functions = [
    upsert_product_profile,
    evolve_typical_user,
    track_interaction,
    log_review_insights,
    process_return_impact,
]

# ------------------------------------------------------------------
# SYSTEM PROMPT
# ------------------------------------------------------------------

def construct_system_prompt() -> str:
    return """
<system_context>
    <role>
        You are the **ProductVectorizerAgent**. Your job is to process incoming events and update the Qdrant Vector DB immediately.
    </role>
    
    <mandate>
        1. Receive an Event.
        2. Execute the corresponding Tool.
        3. **STOP** immediately after the tool executes successfully.
    </mandate>
    
    <termination_protocol>
        **CRITICAL:**
        Once you receive a "Success" or "Updated" message from a tool:
        1. DO NOT call the tool again.
        2. DO NOT ask "what's next".
        3. Output a final confirmation sentence starting with "DONE:".
        
        Example:
        Tool Output: "Success: Product updated."
        Your Response: "DONE: Updated profile for product_123."
    </termination_protocol>
</system_context>

<reasoning_protocols>

    <protocol event="ProductAddedEvent">
        <logic>
            Call `upsert_product_profile`.
            - Infer `brand` from name if missing.
            - Default `condition`="New", `is_discounted`=False.
        </logic>
    </protocol>

    <protocol event="ProductUpdatedEvent">
        <logic>
            Call `upsert_product_profile`.
            - Only pass arguments for fields that are NOT None.
        </logic>
    </protocol>

    <protocol event="PurchaseMadeEvent">
        <logic>
            1. Call `evolve_typical_user(product_id, user_id)`.
            2. Call `track_interaction(interaction_type="buy", desirability_delta=0.5)`.
        </logic>
    </protocol>

    <protocol event="AddToCartEvent">
        <logic>
            Call `track_interaction(interaction_type="add", desirability_delta=0.2)`.
        </logic>
    </protocol>

    <protocol event="RemoveFromCartEvent">
        <logic>
            Call `track_interaction(interaction_type="remove", desirability_delta=-0.15)`.
        </logic>
    </protocol>

    <protocol event="ReviewSubmittedEvent">
        <logic>
            1. Calculate `sentiment_score` (-1.0 to 1.0) based on rating.
            2. Detect `is_quality_issue` (true if text mentions defect/broken).
            3. Extract key noun tags.
            4. Call `log_review_insights`.
        </logic>
    </protocol>

    <protocol event="ReturnRefundEvent">
        <logic>
            - If reason is defect -> `is_taste_mismatch=False`.
            - If reason is preference -> `is_taste_mismatch=True`.
            - Call `process_return_impact`.
        </logic>
    </protocol>

</reasoning_protocols>
"""

# ------------------------------------------------------------------
# AGENT
# ------------------------------------------------------------------

agent = LlmAgent(
    name="ProductVectorizerAgent",
    model=llm,
    instruction=construct_system_prompt(),
    tools=tool_functions,
)