import asyncio
import json
import os
import sys
import uuid
import logging
from dotenv import load_dotenv
from aiokafka import AIOKafkaConsumer

# --- ADK IMPORTS ---
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

# --- SETUP PATHS ---
load_dotenv(override=True)
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# --- MODULE IMPORTS ---
from product_vectorizer.agent import agent
from product_vectorizer.events import *
from product_vectorizer.tools import ensure_product_collections

# --- LOGGING CONFIGURATION ---
# Clean format without emojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ProdConsumer")

# --- CONFIGURATION ---
ensure_product_collections()

TOPICS = ["user-events", "catalog-events"]
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
CONSUMER_GROUP = "product_vectorizer_group_01"

# Map Event Names to Pydantic Models
EVENT_MAP = {
    "ProductAddedEvent": ProductAddedEvent,
    "ProductUpdatedEvent": ProductUpdatedEvent,
    "PurchaseMadeEvent": PurchaseMadeEvent,
    "AddToCartEvent": AddToCartEvent,
    "RemoveFromCartEvent": RemoveFromCartEvent,
    "ReturnRefundEvent": ReturnRefundEvent,
    "ReviewSubmittedEvent": ReviewSubmittedEvent
}

async def process_event(event_data: dict, runner: Runner, session_service: InMemorySessionService):
    """
    Parses the event, creates a unique session, and executes the Agent.
    """
    event_type = event_data.get("event_type")
    payload = event_data.get("payload")

    if event_type not in EVENT_MAP:
        return

    try:
        # 1. Rate Limit Buffer (Yield control)
        # -------------------------------------------------
        await asyncio.sleep(5) 

        # 2. Parse Event
        # -------------------------------------------------
        logger.info("[START] Processing event: %s", event_type)
        event_obj = EVENT_MAP[event_type](**payload)

        # 3. Session Setup (Stateless / Unique per event)
        # -------------------------------------------------
        session_id = f"worker_{uuid.uuid4()}"
        user_id = "system_agent"
        
        # Directly create the session (no need to check get_session for a unique UUID)
        await session_service.create_session(
            app_name=agent.name, 
            user_id=user_id, 
            session_id=session_id
        )

        # 4. Construct Prompt
        # -------------------------------------------------
        query_text = f"Event Received: {event_type}\nData: {event_obj.model_dump_json()}"
        content = types.Content(role='user', parts=[types.Part(text=query_text)])

        # 5. Execute Agent with Retry Logic
        # -------------------------------------------------
        max_retries = 3
        current_retry = 0

        while current_retry <= max_retries:
            try:
                # We iterate through the stream to log tool calls and final answers
                async for response in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
                    
                    # Log Tool Calls (Intermediate steps)
                    if response.content and response.content.parts:
                        for part in response.content.parts:
                            if part.function_call:
                                logger.info("Tool Call: %s", part.function_call.name)
                            if part.text and response.is_final_response():
                                logger.info("Agent Output: %s", part.text.strip())

                # If loop finishes without error, we are done
                logger.info("[DONE] Finished event: %s", event_type)
                break 

            except Exception as e:
                err_str = str(e)
                # Check for Rate Limits (429 or specific library errors)
                if "429" in err_str or "Rate limit" in err_str or "rate_limited" in err_str:
                    wait_time = 15 * (current_retry + 1)
                    logger.warning("[RATE LIMIT] Hit limit. Retrying in %ss (Attempt %s/%s)", wait_time, current_retry + 1, max_retries)
                    await asyncio.sleep(wait_time)
                    current_retry += 1
                    
                    if current_retry > max_retries:
                        logger.error("[DROP] Dropping event %s after max retries.", event_type)
                else:
                    # Non-retryable error
                    logger.error("[ERROR] Agent failed during execution: %s", e)
                    break

    except Exception as e:
        logger.exception("[CRITICAL] Unhandled error processing %s: %s", event_type, e)


async def consume():
    logger.info("Connecting to broker: %s", KAFKA_BOOTSTRAP_SERVERS)
    logger.info("Subscribing to topics: %s", TOPICS)
    
    consumer = AIOKafkaConsumer(
        *TOPICS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=CONSUMER_GROUP,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest'
    )

    # Initialize Agent Runner
    session_service = InMemorySessionService()
    runner = Runner(agent=agent, app_name=agent.name, session_service=session_service)

    # Connection Retry Loop
    while True:
        try:
            await consumer.start()
            logger.info("[SUCCESS] Product Vectorizer Connected to Kafka")
            break
        except Exception as e:
            logger.warning("[WAIT] Kafka not ready yet (%s). Retrying in 5 seconds...", e)
            await asyncio.sleep(5)

    logger.info("--- Consumer Listening ---")

    try:
        async for msg in consumer:
            await process_event(msg.value, runner, session_service)
    except Exception as e:
        logger.error("[CRITICAL] Consumer loop crashed: %s", e)
    finally:
        await consumer.stop()
        logger.info("[STOP] Consumer stopped")

if __name__ == "__main__":
    try:
        asyncio.run(consume())
    except KeyboardInterrupt:
        logger.info("Process interrupted by user.")