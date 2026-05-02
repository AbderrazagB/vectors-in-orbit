import asyncio
import json
import uuid
import logging
import sys
import os

from aiokafka import AIOKafkaConsumer
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from dotenv import load_dotenv
# Import your local modules
from user_profiler.agent import agent
from user_profiler.events import *
from user_profiler.helpers import ensure_collections

load_dotenv(override=True)


# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
KAFKA_TOPIC = "user-events"
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
# CRITICAL: A unique group ID ensures this agent gets its own copy of messages
CONSUMER_GROUP = "user_profiler_group_01"

# Ensure Qdrant collections exist before starting
ensure_collections()

EVENT_MAP = {
    "ProfileCreatedEvent": ProfileCreatedEvent,
    "SearchPerformedEvent": SearchPerformedEvent,
    "AddToCartEvent": AddToCartEvent,
    "RemoveFromCartEvent": RemoveFromCartEvent,
    "PurchaseMadeEvent": PurchaseMadeEvent,
    "WishlistAddedEvent": WishlistAddedEvent,
    "ReviewSubmittedEvent": ReviewSubmittedEvent,
    "FilterAppliedEvent": FilterAppliedEvent,
    "ProfileUpdatedEvent": ProfileUpdatedEvent,
    "ReturnRefundEvent": ReturnRefundEvent
}

async def process_event(event_data: dict, runner: Runner, session_service):
    """
    Parses the event, creates a session, and runs the ADK Agent.
    """
    
    event_type = event_data.get("event_type")
    payload = event_data.get("payload", {})
    
    # Generate a unique session ID for this specific event processing
    # This keeps the context window clean for the agent.
    session_id = str(uuid.uuid4())
    user_id = "profiler_agent"

    if event_type in EVENT_MAP:
        try:
            # 1. Validate Payload
            event_obj = EVENT_MAP[event_type](**payload)
            logger.info(f"Processing {event_type} | Session: {session_id}")

            # 2. Create Session
            await session_service.create_session(app_name=agent.name, user_id=user_id, session_id=session_id)

            # 3. Construct Message
            query_text = f"Event Type: {event_type}\nData: {event_obj.model_dump_json()}"
            content = types.Content(role='user', parts=[types.Part(text=query_text)])

            # 4. Run Agent with Retry Logic (for API Rate Limits)
            max_retries = 3
            current_retry = 0
            
            while current_retry <= max_retries:
                try:
                    async for response in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
                        # Log the final textual response from the LLM
                        if response.is_final_response():
                            if response.content and response.content.parts:
                                logger.info(f"Agent Insight: {response.content.parts[0].text}")
                            elif response.actions and response.actions.escalate:
                                logger.error(f"Agent Escalation: {response.error_message}")
                            break # Finish processing this event
                    break # Success, exit retry loop

                except Exception as e:
                    # Handle API Rate Limits
                    if "429" in str(e) or "Rate limit" in str(e) or "rate_limited" in str(e):
                        wait_time = 15 * (current_retry + 1)
                        logger.warning(f"Rate Limit Hit. Retrying in {wait_time}s... (Attempt {current_retry + 1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        current_retry += 1
                        if current_retry > max_retries:
                            logger.error(f"Dropping event {event_type} after max retries.")
                    else:
                        raise e # Raise other errors immediately

        except Exception as e:
            logger.error(f"Error processing {event_type}: {e}")
    else:
        # Ignore events not in our map (e.g., catalog events)
        logger.debug(f"Skipping unrelated event: {event_type}")

async def consume():
    print(f"[DEBUG] Connecting to broker: {KAFKA_BOOTSTRAP_SERVERS}")
    print(f"[DEBUG] Subscribing to topic: {KAFKA_TOPIC} as group: {CONSUMER_GROUP}")

    # Initialize Consumer with explicit Group ID
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=CONSUMER_GROUP,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest' # Start from beginning if this is a new group
    )

    # Initialize Agent components
    session_service = InMemorySessionService()
    runner = Runner(
        agent=agent,
        app_name=agent.name,
        session_service=session_service
    )

    while True:
        try:
            await consumer.start()
            print("✅ Connected to Kafka!")
            break # Exit loop if successful
        except Exception as e:
            print(f"⏳ Kafka not ready yet ({e}). Retrying in 5 seconds...")
            await asyncio.sleep(5)
    # --- RETRY LOGIC END --
    logger.info(f"--- User Profiler Listening on {KAFKA_TOPIC} ---")

    try:
        async for msg in consumer:
            logger.info(f"Message received [Partition {msg.partition}]: {msg.value}")
            await process_event(msg.value, runner, session_service)
    except Exception as e:
        logger.critical(f"Consumer crashed: {e}")
    finally:
        await consumer.stop()

if __name__ == "__main__":
    asyncio.run(consume())