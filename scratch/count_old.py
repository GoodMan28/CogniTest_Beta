from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority')
db = client['cognitest']

old_institute_id = ObjectId("6a8a24a2dc736a46251dfa75") # Newton

for coll in ['physics_questions', 'chemistry_questions', 'biology_questions', 'mathematics_questions']:
    cnt = db[coll].count_documents({"instituteId": old_institute_id})
    print(f"{coll}: {cnt} questions")

client.close()
