from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import MONGO_URI, DATABASE_NAME
import sys


class MongoDBConnection:
    """Manages MongoDB connection and operations."""
    
    def __init__(self):
        self.client = None
        self.db = None
    
    def connect(self):
        """Establish connection to MongoDB."""
        try:
            self.client = MongoClient(MONGO_URI)
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[DATABASE_NAME]
            print(f"Successfully connected to MongoDB: {DATABASE_NAME}")
            return True
        except ConnectionFailure as e:
            print(f" Failed to connect to MongoDB: {e}")
            sys.exit(1)
    
    def get_collection(self, collection_name):
        """Get a collection from the database."""
        if self.db is None:
            self.connect()
        return self.db[collection_name]
    
    def drop_collection(self, collection_name):
        """Drop a collection."""
        if self.db is None:
            self.connect()
        self.db[collection_name].drop()
        print(f" Dropped collection: {collection_name}")
    
    def reset_database(self):
        """Drop all collections in the database."""
        if self.db is None:
            self.connect()
        
        collections = self.db.list_collection_names()
        for collection in collections:
            self.drop_collection(collection)
        print(" Database reset complete")
    
    def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            print(" MongoDB connection closed")
