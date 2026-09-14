from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority')
db = client['cognitest']

old_institute_id = ObjectId("6a8a24a2dc736a46251dfa75") # Newton
new_institute_id = ObjectId("6aa70c122d7b8807b8d82e35") # Newton Tut Pvt Ltd

collections = ['physics_questions', 'chemistry_questions', 'biology_questions', 'mathematics_questions']

total_copied = 0

for coll_name in collections:
    coll = db[coll_name]
    
    # Check if we already copied to prevent duplicates?
    # Actually, we should just copy them if they are not already there.
    # To prevent duplicates, we can check if there are already questions in the new institute for this collection.
    existing = coll.count_documents({"instituteId": new_institute_id})
    if existing > 100:
        print(f"Skipping {coll_name} - already has {existing} questions.")
        continue
    
    questions = list(coll.find({"instituteId": old_institute_id}))
    if not questions:
        print(f"No questions found for {coll_name} in old institute.")
        continue
        
    new_questions = []
    for q in questions:
        q_copy = q.copy()
        del q_copy['_id']
        q_copy['instituteId'] = new_institute_id
        new_questions.append(q_copy)
        
    if new_questions:
        coll.insert_many(new_questions)
        print(f"Copied {len(new_questions)} questions to {coll_name}")
        total_copied += len(new_questions)

print(f"Total questions copied: {total_copied}")
client.close()
