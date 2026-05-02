import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "nexus_ai_store")

# CSV file paths
CSV_FILES = {
    "jojo": "../data/jojo.csv",
    "lefties": "../data/lefties.csv",
    "lefties_1": "../data/lefties(1).csv",
    "lefties_2": "../data/lefties(2).csv",
    "mytek": "../data/mytek(1).csv"
}

# Collection names
COLLECTIONS = {
    "users": "users",
    "carts": "carts",
    "orders": "orders",
    "reviews": "reviews",
    "wishlists": "wishlists",
    "purchases": "purchases"
}
