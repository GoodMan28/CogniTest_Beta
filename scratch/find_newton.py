from pymongo import MongoClient
import json

client = MongoClient('mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority')
db = client['cognitest']

institutes = list(db.institutes.find({"name": {"$regex": "Newton", "$options": "i"}}))
for inst in institutes:
    print(f"ID: {inst['_id']}, Name: {inst['name']}")

client.close()
