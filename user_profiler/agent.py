import os
import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from .events import *
from .tools import (
    ReinforcePositiveTaste, LearnNegativeTaste, UpdateBrandAffinity,
    UpdateSizeAffinity, AddPsychographicTrait, LogLifeEvent, UpdateDemographics,
    ProcessTransactionStats, FlagPriceHesitation, SetAspirationalBudget, UpdateSeasonality,
    SetActiveSearchIntent, AddPassiveWishlistIntent, FulfillIntent
)

from .helpers import ensure_collections

# --- SETUP ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

load_dotenv(override=True)
ensure_collections()

# Initialize LLM
mixtral_llm = LiteLlm(model="mistral/mistral-large-latest")

# --- TOOL INSTANCES (Implementation Logic) ---
_impl_reinforce_positive_taste = ReinforcePositiveTaste()
_impl_learn_negative_taste = LearnNegativeTaste()
_impl_update_brand_affinity = UpdateBrandAffinity()
_impl_update_size_affinity = UpdateSizeAffinity()
_impl_add_psychographic_trait = AddPsychographicTrait()
_impl_log_life_event = LogLifeEvent()
_impl_update_demographics = UpdateDemographics()
_impl_process_transaction_stats = ProcessTransactionStats()
_impl_flag_price_hesitation = FlagPriceHesitation()
_impl_set_aspirational_budget = SetAspirationalBudget()
_impl_update_seasonality = UpdateSeasonality()
_impl_set_active_search_intent = SetActiveSearchIntent()
_impl_add_passive_wishlist_intent = AddPassiveWishlistIntent()
_impl_fulfill_intent = FulfillIntent()

# --- TOOL FUNCTIONS (Exposed to LLM) ---
# Naming Convention: snake_case matching the prompt instructions exactly.

def reinforce_positive_taste(user_id: str, weight: float, product_id: str = None, concept_text: str = None):
    """
    Reinforces the user's positive taste. Use when user buys/likes an item.
    Args:
        user_id: ID of the user.
        weight: Impact 0.0-1.0 (e.g. 0.5 for buy).
        product_id: ID of product to learn from.
        concept_text: Text description (optional).
    """
    return _impl_reinforce_positive_taste.execute(user_id, weight, product_id, concept_text)

def learn_negative_taste(user_id: str, weight: float, reason_category: str, product_id: str = None, concept_text: str = None):
    """
    Updates negative taste. Use when user returns/removes/dislikes item.
    Args:
        user_id: ID of the user.
        weight: Impact 0.0-1.0.
        reason_category: e.g. 'price', 'quality', 'style'.
        product_id: ID of product to avoid.
    """
    return _impl_learn_negative_taste.execute(user_id, weight, reason_category, product_id, concept_text)

def update_brand_affinity(user_id: str, increment: float, product_id: str = None, brand_name: str = None):
    """
    Increments affinity for a brand.
    Args:
        increment: e.g. +1.0 for buy.
        product_id: Infer brand from this product.
        brand_name: Explicit brand name.
    """
    return _impl_update_brand_affinity.execute(user_id, increment, product_id, brand_name)

def update_size_affinity(user_id: str, size_code: str):
    """Tracks preferred sizes (e.g. 'M', '42')."""
    return _impl_update_size_affinity.execute(user_id, size_code)

def add_psychographic_trait(user_id: str, trait: str):
    """Adds a trait tag (e.g. 'Gamer', 'Price-Sensitive')."""
    return _impl_add_psychographic_trait.execute(user_id, trait)

def log_life_event(user_id: str, event_name: str, expiry_days: int):
    """Logs life event (e.g. 'Wedding') with expiry."""
    return _impl_log_life_event.execute(user_id, event_name, expiry_days)

def update_demographics(user_id: str, field: str, value: str):
    """Updates demographic field (age, gender, region, status)."""
    return _impl_update_demographics.execute(user_id, field, value)

def process_transaction_stats(user_id: str, amount: float, category: str, is_discount: bool, is_luxury: bool, is_installment: bool):
    """Updates financial stats after purchase."""
    return _impl_process_transaction_stats.execute(user_id, amount, category, is_discount, is_luxury, is_installment)

def flag_price_hesitation(user_id: str, item_price: float, category: str = None, product_id: str = None):
    """Flags price hesitation (e.g. removed from cart)."""
    return _impl_flag_price_hesitation.execute(user_id, item_price, category, product_id)

def set_aspirational_budget(user_id: str, category: str, min_budget: float, max_budget: float):
    """Sets desired budget range for a category."""
    return _impl_set_aspirational_budget.execute(user_id, category, min_budget, max_budget)

def update_seasonality(user_id: str, month: int):
    """Tracks active shopping months."""
    return _impl_update_seasonality.execute(user_id, month)

def set_active_search_intent(user_id: str, raw_query: str, expanded_keywords: str, filters: dict):
    """Updates current search intent."""
    return _impl_set_active_search_intent.execute(user_id, raw_query, expanded_keywords, filters)

def add_passive_wishlist_intent(user_id: str, product_desc: str, image_url: str, urgency_days: int, budget_min: float, budget_max: float):
    """Adds item to passive wishlist intent."""
    return _impl_add_passive_wishlist_intent.execute(user_id, product_desc, image_url, urgency_days, budget_min, budget_max)

def fulfill_intent(user_id: str, product_id: str, category: str):
    """Marks intent as fulfilled after purchase."""
    return _impl_fulfill_intent.execute(user_id, product_id, category)

# Tool List
tool_functions = [
    reinforce_positive_taste, learn_negative_taste, update_brand_affinity,
    update_size_affinity, add_psychographic_trait, log_life_event,
    update_demographics, process_transaction_stats, flag_price_hesitation,
    set_aspirational_budget, update_seasonality, set_active_search_intent,
    add_passive_wishlist_intent, fulfill_intent
]

# --- SYSTEM PROMPT (Aligned Names) ---

def construct_system_prompt() -> str:
    return """
<system_context>
    <role>
        You are the **UserProfilingAgent**, an autonomous engine responsible for translating raw user interaction events into precise, structured updates for a Vector Database (Qdrant).
    </role>
    
    <mandate>
        1. Receive an Event (JSON).
        2. IMMEDIATELY generate the necessary Tool Calls to update the user's profile.
        3. Only after tools are executed, provide a concise 1-sentence summary of what changed.
    </mandate>
    
    <critical_constraints>
        * **NO CONVERSATIONAL FILLER:** Do not say "Understood", "I will process this", or "I am ready".
        * **ACT FIRST:** Your response must start with Tool Calls.
        * **INTERPRET AMBIGUITY:** If a review text implies a trait (e.g., "perfect for gaming"), you must explicitly call `add_psychographic_trait` with `trait="Gamer"`. Do not wait for permission.
    </critical_constraints>
</system_context>

<available_tools>
    * reinforce_positive_taste(user_id, weight, product_id)
    * learn_negative_taste(user_id, weight, product_id, reason)
    * update_brand_affinity(user_id, product_id, increment)
    * update_size_affinity(user_id, product_id)
    * add_psychographic_trait(user_id, trait, score)
    * log_life_event(user_id, event_name)
    * update_demographics(user_id, age, gender, location, device)
    * process_transaction_stats(user_id, transaction_amount)
    * flag_price_hesitation(user_id, price_point)
    * set_aspirational_budget(user_id, budget_max, category)
    * update_seasonality(user_id, month)
    * set_active_search_intent(user_id, query, category)
    * add_passive_wishlist_intent(user_id, product_id, note)
    * fulfill_intent(user_id, product_id)
</available_tools>

<reasoning_protocols>

    <protocol event="ReviewSubmittedEvent">
        <trigger>User submits a text review and rating.</trigger>
        <logic>
            1. **Rating Logic:**
               - If `rating` >= 4.0: Call `reinforce_positive_taste(weight=0.3, product_id=...)`.
               - If `rating` <= 2.0: Call `learn_negative_taste(weight=0.8, product_id=..., reason="bad_review")`.
            
            2. **Text Analysis (Psychographics):**
               - Scan `review_text` for Identity Markers.
               - If text contains ("stream", "twitch", "camera", "mic"): Call `add_psychographic_trait(trait="Streamer", score=0.8)`.
               - If text contains ("game", "fps", "lag", "console"): Call `add_psychographic_trait(trait="Gamer", score=0.8)`.
               - If text contains ("office", "work", "zoom", "meeting"): Call `add_psychographic_trait(trait="Professional", score=0.6)`.
               - If text contains ("sturdy", "durable", "metal", "solid"): Call `add_psychographic_trait(trait="Quality-Conscious", score=0.5)`.
               - If text contains ("cheap", "deal", "expensive", "value"): Call `add_psychographic_trait(trait="Price-Sensitive", score=0.5)`.
        </logic>
    </protocol>

    <protocol event="PurchaseMadeEvent">
        <trigger>User completes a transaction.</trigger>
        <logic>
            1. Call `process_transaction_stats` with `total_amount`.
            2. Call `update_brand_affinity(increment=0.5)` for the `product_id`.
            3. Call `update_seasonality` (extract month from timestamp).
            4. Call `fulfill_intent` to close any open search intents for this item.
            5. Call `reinforce_positive_taste(weight=0.5)` to solidify preference.
        </logic>
    </protocol>

    <protocol event="AddToCartEvent">
        <trigger>User puts item in cart.</trigger>
        <logic>
            1. Call `reinforce_positive_taste(weight=0.2)`.
            2. Call `update_brand_affinity(increment=0.2)`.
            3. Call `update_size_affinity` (if product has size metadata).
        </logic>
    </protocol>

    <protocol event="RemoveFromCartEvent">
        <trigger>User removes item from cart.</trigger>
        <logic>
            1. Call `flag_price_hesitation` using the product's `price`.
            2. Call `learn_negative_taste(weight=0.2, reason="cart_abandonment")`.
        </logic>
    </protocol>

    <protocol event="SearchPerformedEvent">
        <trigger>User types a query.</trigger>
        <logic>
            1. Call `set_active_search_intent` with the `query`.
            2. **Keyword Analysis:**
               - If query contains ("wedding", "baby", "job", "move"): Call `log_life_event`.
               - If query implies technical specs ("4k", "144hz", "mechanical"): Call `add_psychographic_trait(trait="Tech-Savvy", score=0.4)`.
        </logic>
    </protocol>

    <protocol event="WishlistAddedEvent">
        <trigger>User saves an item for later.</trigger>
        <logic>
            1. Call `add_passive_wishlist_intent(product_id=..., note=wishlist_notes)`.
            2. If `budget_max` is present: Call `set_aspirational_budget(budget_max=...)`.
            3. If `urgency_days` > 30: Call `add_psychographic_trait(trait="Planner", score=0.3)`.
        </logic>
    </protocol>

    <protocol event="ReturnRefundEvent">
        <trigger>User returns an item.</trigger>
        <logic>
            - If `reason` is "changed_mind" or "don't like": Call `learn_negative_taste(weight=0.5)`.
            - If `reason` is "too expensive" or "found cheaper": Call `flag_price_hesitation`.
        </logic>
    </protocol>

    <protocol event="FilterAppliedEvent">
        <trigger>User applies UI filters.</trigger>
        <logic>
            - If `filters` contains "Brand": Call `update_brand_affinity(increment=0.3)`.
            - If `filters` contains "Price": Call `set_aspirational_budget`.
        </logic>
    </protocol>

    <protocol event="ProfileCreatedEvent">
        <trigger>User signs up.</trigger>
        <logic>
            1. Call `update_demographics(age=..., gender=..., region=..., device=...)`.
        </logic>
    </protocol>

</reasoning_protocols>
"""
agent = LlmAgent(
    name="UserProfilingAgent",
    model=mixtral_llm,
    instruction=construct_system_prompt(),
    tools=tool_functions
)