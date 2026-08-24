import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';
// @ts-ignore
import { pipeline } from '@xenova/transformers';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cognitest";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const INDEX_NAME = 'cognitest-embeddings';

const embedQuestions = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
        
        // Ensure index exists
        const { indexes } = await pc.listIndexes();
        const indexExists = indexes?.some(i => i.name === INDEX_NAME);
        
        if (!indexExists) {
            console.log(`Creating Pinecone index '${INDEX_NAME}'... (this takes ~1 min)`);
            await pc.createIndex({
                name: INDEX_NAME,
                dimension: 384,
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } }
            });
            // Wait a bit for the index to be fully ready
            await new Promise(r => setTimeout(r, 60000));
        }
        
        const index = pc.Index(INDEX_NAME);
        console.log(`Pinecone index '${INDEX_NAME}' is ready.`);

        // Initialize local embedding model
        console.log("Loading Xenova/all-MiniLM-L6-v2 local model... (will download on first run)");
        const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        const processCollection = async (Model: mongoose.Model<any>, subject: string) => {
            const questions = await Model.find({ isEmbedded: false });
            console.log(`Found ${questions.length} unembedded ${subject} questions.`);

            const batchSize = 10;
            for (let i = 0; i < questions.length; i += batchSize) {
                const batch = questions.slice(i, i + batchSize);
                const vectors = [];

                for (const q of batch) {
                    const textToEmbed = `Intent: ${q.questionIntent}. Content: ${q.questionText}`;
                    
                    // Generate 384-dimensional vector
                    const output = await embedder(textToEmbed, { pooling: 'mean', normalize: true });
                    const embeddingArray = Array.from(output.data);

                    vectors.push({
                        id: q._id.toString(),
                        values: embeddingArray as number[],
                        metadata: {
                            subject: q.subject,
                            chapter: q.chapter,
                            topic: q.topic.join(", ")
                        }
                    });
                }

                // Upsert to Pinecone
                if (vectors.length > 0) {
                    await index.upsert({ records: vectors });
                    
                    // Mark as embedded in MongoDB
                    await Model.updateMany(
                        { _id: { $in: batch.map(q => q._id) } },
                        { $set: { isEmbedded: true } }
                    );
                    
                    console.log(`Upserted batch of ${vectors.length} ${subject} questions.`);
                }
            }
        };

        await processCollection(PhysicsQuestion, "Physics");
        await processCollection(ChemistryQuestion, "Chemistry");
        await processCollection(BiologyQuestion, "Biology");

        console.log("All questions successfully embedded and pushed to Pinecone!");
        process.exit(0);

    } catch (err) {
        console.error("Error during embedding pipeline:", err);
        process.exit(1);
    }
};

embedQuestions();
