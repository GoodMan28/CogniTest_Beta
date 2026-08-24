import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cognitest";
const instituteId = new mongoose.Types.ObjectId("64a1b2c3d4e5f6a7b8c9d0e1");

const parseFile = (filePath: string) => {
    let rawContent = '';
    try {
        rawContent = fs.readFileSync(filePath, 'utf-8');
        
        // Remove literal newlines to avoid JSON parsing breaking on multi-line strings
        rawContent = rawContent.replace(/\r?\n/g, ' ');
        
        // Remove potential markdown blocks
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '');
        
        // Fix concatenated batches: if user pasted multiple arrays like ]  [ , merge them:
        rawContent = rawContent.replace(/]\s*\[/g, ',');
        
        // Fix LLM unescaped backslashes in LaTeX (e.g., \frac -> \\frac)
        rawContent = rawContent.replace(/\\/g, '\\\\')
                               .replace(/\\\\"/g, '\\"')
                               .replace(/\\\\n/g, '\\n');
        
        // Fix specific known LLM unescaped internal quotes that break standard JSON parsers
        rawContent = rawContent.replace(/"6,6"/g, '\\"6,6\\"');
        rawContent = rawContent.replace(/"tetraammineplatinum\(II\)"/g, '\\"tetraammineplatinum(II)\\"');
        rawContent = rawContent.replace(/"tetrachloridoplatinate\(II\)"/g, '\\"tetrachloridoplatinate(II)\\"');
        
        return JSON.parse(rawContent);
    } catch (e: any) {
        console.error(`Error parsing file: ${filePath}`);
        const match = e.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1], 10);
            console.error("Context around error:", rawContent.substring(Math.max(0, pos - 50), pos + 50));
        }
        console.error(e);
        return [];
    }
}

const runSeed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const physicsFile = "C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material/dummy_questions/physics.txt";
        const chemistryFile = "C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material/dummy_questions/chemistry.txt";
        const biologyFile = "C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material/dummy_questions/biologyt.txt";

        // Read and parse
        const physicsData = parseFile(physicsFile);
        const chemistryData = parseFile(chemistryFile);
        const biologyData = parseFile(biologyFile);

        console.log(`Parsed ${physicsData.length} Physics questions.`);
        console.log(`Parsed ${chemistryData.length} Chemistry questions.`);
        console.log(`Parsed ${biologyData.length} Biology questions.`);

        // Clear existing questions for the institute to avoid duplicates/messy data
        console.log("Clearing old questions for institute...");
        await PhysicsQuestion.deleteMany({ instituteId });
        await ChemistryQuestion.deleteMany({ instituteId });
        await BiologyQuestion.deleteMany({ instituteId });

        // Ensure instituteId is correctly set as ObjectId just in case the JSON has strings
        const mapData = (data: any[]) => data.map(item => ({
            ...item,
            instituteId
        }));

        if (physicsData.length > 0) {
            await PhysicsQuestion.insertMany(mapData(physicsData));
            console.log("Inserted Physics questions.");
        }
        
        if (chemistryData.length > 0) {
            await ChemistryQuestion.insertMany(mapData(chemistryData));
            console.log("Inserted Chemistry questions.");
        }

        if (biologyData.length > 0) {
            await BiologyQuestion.insertMany(mapData(biologyData));
            console.log("Inserted Biology questions.");
        }

        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error connecting or inserting data:", err);
        process.exit(1);
    }
};

runSeed();
