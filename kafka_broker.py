# kafka_broker.py
import asyncio
import os
import json
from aiokafka import AIOKafkaProducer

# Topic Definitions
TOPIC_USER_EVENTS = "user-events"       # High volume: clicks, cart, purchase
TOPIC_CATALOG_EVENTS = "catalog-events" # Low volume: product admin

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
class KafkaBroker:
    def __init__(self):
        self.producer = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await self.producer.start()

    async def stop(self):
        if self.producer:
            await self.producer.stop()

    async def send_event(self, event_type: str, data: dict):
        if not self.producer:
            raise Exception("Producer not started")
        
        # Routing Logic
        if event_type in ["ProductAddedEvent", "ProductUpdatedEvent"]:
            topic = TOPIC_CATALOG_EVENTS
        else:
            topic = TOPIC_USER_EVENTS

        message = {
            "event_type": event_type,
            "payload": data
        }
        
        print(f"[Broker] Sending {event_type} to topic '{topic}'")
        await self.producer.send_and_wait(topic, message)

broker = KafkaBroker()