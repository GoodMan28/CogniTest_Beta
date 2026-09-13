from pymongo import MongoClient
from app.config import settings
from typing import Optional

class DatabaseClient:
    client: Optional[MongoClient] = None
    
    def connect(self):
        self.client = MongoClient(settings.mongodb_uri)
        # ping to test connection
        self.client.admin.command('ping')
        
    def disconnect(self):
        if self.client:
            self.client.close()
            self.client = None
            
    def get_db(self):
        if not self.client:
            self.connect()
        return self.client.get_default_database()

db_client = DatabaseClient()
