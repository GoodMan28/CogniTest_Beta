"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const evaluationController_1 = require("./src/controllers/evaluationController");
const EvaluationReport_1 = require("./src/models/EvaluationReport");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority';
async function run() {
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('Connected to DB');
    const studentIds = await EvaluationReport_1.EvaluationReport.distinct('studentId');
    console.log(`Found ${studentIds.length} students with reports.`);
    for (const studentId of studentIds) {
        try {
            await (0, evaluationController_1.generateStudentAnalytics)(studentId.toString());
            console.log(`Generated analytics for student ${studentId}`);
        }
        catch (e) {
            console.error(`Error generating for ${studentId}:`, e);
        }
    }
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
