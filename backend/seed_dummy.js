const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');

async function seed() {
  try {
    const mongoUri = 'mongodb://localhost:27017/cognitest?retryWrites=false';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    function parseFile(filename, subject, collectionName) {
      const fullPath = path.join(__dirname, '../Sample_material/dummy_questions', filename);
      let text = fs.readFileSync(fullPath, 'utf8');
      
      // Escape invalid backslashes (e.g. \text -> \\text)
      text = text.replace(/\\([^"\\/bfnrt])/g, '\\\\$1');
      
      try {
        const data = JSON.parse(text);
        
        // Add missing fields
        const formatted = data.map(q => ({
          ...q,
          instituteId: new mongoose.Types.ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"),
          subject: subject,
          isEmbedded: false
        }));
        
        return mongoose.connection.collection(collectionName).insertMany(formatted)
          .then(res => console.log(`Inserted ${res.insertedCount} into ${collectionName}`));
      } catch(e) {
        console.error(`Failed to parse ${filename}:`, e.message);
      }
    }
    
    await parseFile('biologyt.txt', 'Biology', 'biology_questions');
    await parseFile('chemistry.txt', 'Chemistry', 'chemistry_questions');
    await parseFile('physics_fixed.txt', 'Physics', 'physics_questions');
    
    console.log('Dummy questions seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed();
