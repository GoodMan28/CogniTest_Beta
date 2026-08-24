# 1. Core System Context & MVP Constraints

## Platform Objective
We are building CogniTest, an enterprise-grade AI Assessment and Analytics SaaS backend and React dashboard. The system is engineered for large-scale competitive exam coaching institutes (specifically NEET/JEE preparation) handling massive volumes of data (4,000+ concurrent students, 20,000+ legacy question banks).

## User Roles & System Workflows
The architecture must strictly enforce separation of concerns between two distinct user experiences:
- **Admin/Educator**: Uploads weekly physical OMR sheets (scanned) and test papers with answer keys. The system automatically evaluates responses and computes long-term analytics. Admins do not manually create practice tests on a daily basis.
- **Student (The Core Moat)**: Operates a completely self-serve dashboard. Students consume their multi-test SWOT (Strengths, Weaknesses, Opportunities, Threats) analytics and utilize a dual-path Custom Test Generator to drive their own practice.

## Technical Complexity Requirements
- **Data Handling**: The system cannot rely on simple text strings. NEET/JEE questions contain complex mathematical formulas, chemical structures, and scientific diagrams. The database schema must handle LaTeX strings and AWS S3 URLs for cropped images natively.
- **Dual-Path Test Generation**: The backend must support both Dynamic RAG Tests (using an Item-to-Item vector similarity search in Pinecone to target historical weaknesses) and Static Filter Tests (fast, indexed MongoDB aggregations for chapter-wise drills).

## Strict MVP Constraints & Shortcuts (3-Day Deadline)
This codebase is being built for a live, functional MVP prototype demo.
- **Prioritize**: The synchronous OMR evaluation pipeline, the student dashboard UI, and the Custom Test generation endpoints.
- **Pre-Seeded Data**: Do not build the complex, asynchronous cloud OCR pipeline for legacy PDF ingestion right now. Bypass this by pre-seeding MongoDB and Pinecone with ~200 highly complex, structured NEET questions to prove the core concept live.
- **Mocked Bubble Extraction**: Use a deterministic backend script to simulate OpenCV bubble extraction from uploaded OMR images during the live demo.
- **Mocked Authentication**: Do not build JWT auth, password resets, or registration flows. Hardcode a mock instituteId and studentId into context/headers to simulate logged-in states.
- **UI Reference Rule**: Video references provided for frontend design are strictly for visual aesthetics, layout structure, color schemes, and CSS styling only. Do not implement any functional features, mechanics, or sliders shown in video references unless explicitly detailed in our technical specifications.

# 2. System Architecture & Core Data Flows

The CogniTest backend is organized into microservices built on Node.js/Express, communicating via MongoDB Atlas and Pinecone Serverless.

The system operates across four distinct data flows:

**Flow 1: Synchronous Mock Test Evaluation (Admin Upload)**

1. **Intake:** The admin uploads scanned OMR sheet bundles (images) along with the manual Answer Key mapping (via a UI grid or CSV containing `questionNo`, `correctOption`, `chapter`, `topic`).
2. **Storage:** Raw OMR scans are pushed to AWS S3.
3. **Key Registration:** The Answer Key JSON payload is validated and saved directly to the MongoDB `TEST` collection. (Do not use LLMs for this step).
4. **Grading & Reporting:** Student bubble responses are parsed (mocked deterministically for the MVP), graded against the stored `TEST` answer key, and categorized into `correct`, `incorrect`, and `unanswered` arrays within the `EVALUATION_REPORT` collection.
5. **Analytics Trigger:** An aggregation worker runs asynchronously to update the student's multi-test historical profile in the `STUDENT_ANALYTICS` collection (mapping accuracy trends and classifying chapters into strengths/weaknesses).

**Flow 2: Student Dashboard Analytics View**

1. **Request:** The React frontend requests student profile metrics (`GET /api/v1/analytics/student/:studentId`).
2. **Hydration:** The API gateway pulls pre-aggregated JSON from the `STUDENT_ANALYTICS` collection.
3. **Render:** Data is structured directly for radar charts (topic balance) and historical line/area graphs.

**Flow 3: Dual-Path Custom Test Generation**

1. **Request:** The student requests a practice test (`POST /api/v1/custom-test/generate`) specifying `mode` (strictly either `"dynamic"` OR `"static"`) and relevant filters.
2. **Path A (Dynamic AI Weakness Targeting / RAG):**
* Executed when `mode === "dynamic"`.
* The engine fetches the student's recent `EVALUATION_REPORT` entries to isolate incorrect question IDs in weak chapters.
* It queries Pinecone using those failed question IDs as seed vectors, applying strict metadata filters (`instituteId`, `chapter`).
* Pinecone returns Top-K mathematically similar question IDs (item-to-item similarity matching).

3. **Path B (Static Category Drills):**
* Executed when `mode === "static"`.
* Bypasses vector search completely. Executes an indexed MongoDB aggregation query on the `QUESTION` collection using `$match` (subject, unit, chapter) and `$sample` (randomized selection).

4. **Hydration & Output:** Question IDs from either path are batch-hydrated via an `$in` query against the MongoDB `QUESTION` collection to fetch full LaTeX text, options, diagram S3 URLs, and solutions. The JSON array is returned to the client.

**Flow 4: Asynchronous Legacy Module Ingestion (Concept - Bypassed for MVP)**

1. **Intake:** Admin uploads PDF modules.
2. **Parsing & Cropping:** OCR extracts text; figures/diagrams are cropped and uploaded to AWS S3 (`diagramUrl`).
3. **AI Tagging & Embedding:** An LLM extracts fine-grained `topic` tags and generates a 1-sentence `questionIntent`. The `questionIntent` is embedded via OpenAI into a 1536-dimensional vector.
4. **Dual Storage:** The vector and metadata are upserted to Pinecone. The full enriched JSON payload is saved to the MongoDB `QUESTION` collection.
*(Note: As per MVP constraints, do not build this pipeline. Pre-seed the databases to simulate this completed flow).*

# 3. Data Modeling & Schema Specifications

The CogniTest backend utilizes MongoDB Atlas as the primary source of truth for highly relational data and Pinecone Serverless for mathematical similarity search vectors.

## A. MongoDB Mongoose Schemas & TypeScript Interfaces

**1. QUESTION Collection (Source of Truth)**
Stores fully enriched question payloads. Explicitly supports LaTeX strings for math/physics, SMILES strings for chemistry, and AWS S3 URLs for diagrams.

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  instituteId: Types.ObjectId;
  subject: 'Physics' | 'Chemistry' | 'Biology';
  unit: string;
  chapter: string;
  topic: string[];
  questionText: string; // Contains raw LaTeX strings
  diagramUrl?: string;  // AWS S3 Bucket URL for cropped figures/circuits
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  solutionText: string;
  questionIntent: string; // Summarized academic intent embedded into Pinecone
  difficulty: 'Easy' | 'Medium' | 'Hard';
}
```

*Indexing Requirement:* Must include a compound index on `{ instituteId: 1, subject: 1, unit: 1, chapter: 1 }` to ensure ultra-fast static custom test aggregation queries.

**2. TEST Collection (Mock Test Definition)**
Stores the structure of a mock test. Because the `QUESTION` collection already holds all metadata and correct answers, this schema relies purely on relational ObjectIds to avoid data duplication.

```typescript
export interface ITest extends Document {
  instituteId: Types.ObjectId;
  title: string;
  date: Date;
  examType: string; // e.g., "NEET"
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarking: number; // e.g., -1
  questions: Array<{
    questionNo: number; // The visual number on the physical paper (1-180)
    questionId: Types.ObjectId; // References the QUESTION collection
  }>;
}
```

**3. EVALUATION_REPORT Collection (Single Test Result)**
Records the grading outcome for individual student OMR sheets after comparing their bubble choices to the linked `QUESTION` documents.

```typescript
export interface IEvaluationReport extends Document {
  studentId: Types.ObjectId;
  testId: Types.ObjectId;
  score: number;
  totalMarks: number;
  performance: {
    correct: Types.ObjectId[];   // References to QUESTION _id
    incorrect: Types.ObjectId[]; // References to QUESTION _id
    unanswered: Types.ObjectId[];
  };
  omrImageUrl: string;
  createdAt: Date;
}
```

**4. STUDENT_ANALYTICS Collection (Multi-Test SWOT Aggregation)**
Maintains persistent historical performance metrics across all tests taken by a student.

```typescript
export interface IStudentAnalytics extends Document {
  studentId: Types.ObjectId;
  lastUpdated: Date;
  chapterMastery: Array<{
    chapter: string;
    accuracyPercentage: number;
    totalAttempted: number;
  }>;
  swotProfile: {
    criticalWeaknesses: string[]; // Chapters with < 40% accuracy
    strengths: string[];          // Chapters with > 80% accuracy
  };
}
```

## B. Pinecone Vector Database Configuration

* **Index Name:** `cognitest-question-index`
* **Dimension Size:** `1536` (matching OpenAI `text-embedding-3-small`)
* **Distance Metric:** `Cosine`
* **Vector Record Layout:**
  * `id`: String (Must exactly match the MongoDB `_id` of the `QUESTION` document).
  * `values`: Float[] (Mathematical embedding array of the `questionIntent`).
  * `metadata`:
    * `instituteId`: String (Ensures multi-tenant isolation).
    * `subject`: String.
    * `chapter`: String.

# 4. Backend Microservices & 3-Day MVP Strategy

The backend must be built using Node.js, Express, and TypeScript, structured cleanly into controllers and services.

## A. Core API Endpoints to Implement

**1. Test Management Service**

* **Endpoint:** `POST /api/v1/tests`
* **Controller Logic:** Accepts the test metadata (title, total questions, marks) and an array mapping `questionNo` (the physical paper number) to the database `questionId`. Saves this relational structure to the `TEST` collection.

**2. Evaluation Service**

* **Endpoint:** `POST /api/v1/evaluation/upload-batch`
* **Controller Logic:**
  * Receives batch OMR image bundles and the `testId`.
  * Fetches the `TEST` document to get the `questionNo` -> `questionId` mapping.
  * Fetches the corresponding `QUESTION` documents to retrieve the `correctOption` for each ID.
  * Grades the parsed student selections against the fetched questions, calculating scores (including negative marking).
  * Updates the `EVALUATION_REPORT` collection.
  * Triggers an asynchronous background worker to update the `STUDENT_ANALYTICS` multi-test SWOT profiles.

**3. Analytics Service**

* **Endpoint:** `GET /api/v1/analytics/student/:studentId`
* **Controller Logic:** Queries the `STUDENT_ANALYTICS` collection and returns pre-calculated topic mastery percentages, historical score trends, and strength/weakness classifications structured for frontend visualization.

**4. Custom Test Generator Service**

* **Endpoint:** `POST /api/v1/custom-test/generate`
* **Controller Logic:** Accepts `{ studentId, mode: "dynamic" | "static", filters }`.
  * If `mode === "dynamic"`: Fetches the student's recent failed question IDs from `EVALUATION_REPORT`, queries Pinecone using those IDs as seed vectors with metadata filters (`instituteId`, `chapter`), and retrieves Top-K similar question IDs.
  * If `mode === "static"`: Bypasses Pinecone entirely, executing an indexed MongoDB aggregation on `QUESTION` using `$match` (subject, unit, chapter) and `$sample` (random count).
  * Both paths conclude by batch-hydrating full question payloads via an `$in` query against MongoDB `QUESTION` before returning the test JSON.

## B. 3-Day MVP Implementation Strategy (Client Demo Shortcuts)

To ensure a flawless live client demo in 3 days, implement the following architectural shortcuts:

1. **Pre-Seeded Data:** Do not build the heavy PDF ingestion pipeline for the demo. Pre-seed MongoDB and Pinecone with ~200 complex NEET-level questions containing LaTeX strings and S3 diagram URLs.
2. **Mocked OMR Processing:** For the live demo, mock the OpenCV bubble extraction endpoint with a deterministic script that instantly reads sample OMR uploads and outputs a JSON object of student choices to pass to the grading logic.
3. **Live RAG Execution:** Ensure the **Custom Test Generation (Item-to-Item Vector Search)** runs live against Pinecone during the demo. Selecting a student with weak performance in a specific chapter and clicking "Generate Test" must execute the live similarity query and render real questions instantly.

# 5. Frontend UI/UX Specifications

The frontend must be built using React, Tailwind CSS, and standard data-visualization libraries (such as Recharts for radar and line graphs).

**CRITICAL VISUAL CONSTRAINT:**
The design layout must follow a clean, off-white card-based dashboard aesthetic with a fixed left sidebar navigation. Base the visual CSS styling, typography, and color highlights (e.g., green for correct/strengths, red for weak topics) on the visual reference "Screen Recording 2026-08-08 at 8.14.46 PM.mov". **However, this video is for visual reference only. Do not implement any functional mechanics (like percentage sliders) shown in the video.** You must strictly follow the feature specifications below.

## A. Sidebar Navigation Tabs

The navigation panel must include: **Dashboard, Students, Tests, Analytics, Reports, Question Bank, Custom Tests, Settings**.

## B. Core Views & Components to Implement

**1. Main Admin Dashboard (`/dashboard`)**

* **Top Metric Cards:** 4 summary cards for "Active Students", "Mock Tests This Month", "Average Score" (with trend indicator), and "Practice Test Completion Rate".
* **Recent Mock Tests Table:** Lists mock tests with date, student count, average score, top topic (highlighted green), and weakest topic (highlighted red).
* **Performance Extremes Sidebar:** Displays Top 5 and Bottom 5 students with quick links to view their individual analytics.
* **Visualizations:** A horizontal bar chart for "Topic-Wise Class Performance" and an area/line chart for "Score Trend Over Time".
* **Quick Actions Bar:** Direct trigger buttons for "Upload OMR Sheets", "Create New Test", "Generate Practice Tests", and "Send Reports".

**2. Student Directory & Analytics View (`/students` and `/students/:id`)**

* **Student Directory Table:** Lists students with names, batches, overall scores, and a "View Analytics" action link.
* **Individual Student Profile:**
  * Features a **Radar Chart** ("Topic-Wise Balance") mapping curriculum topics (e.g., Plant Physiology, Genetics, Thermodynamics).
  * Includes a **Quick Target Test Panel** on the right side.

**3. Test Management & OMR Upload (`/tests`)**

* **Test Creation Wizard:** Form to configure new tests (title, exam type, total questions, marks per Q, negative marking). Crucially, this includes a manual UI grid/CSV upload to map the physical `questionNo` to the database `questionId`.
* **OMR Upload Interface:** A large drag-and-drop zone for uploading scanned multi-page OMR bundles, complete with a file-queue sidebar, a test selector dropdown, and real-time processing progress bars.

**4. Custom Test Builder (`/custom-tests`)**

* **Configuration Panel (Strictly Binary):** Dropdown for target student selection, followed by two distinct test generation modes (no hybrid sliders):
  * **Option A (Dynamic / AI Weakness Targeting):** A 1-click generation button that triggers the vector search to find questions matching the student's weakest chapters.
  * **Option B (Static Filters):** Standard dropdowns to filter by Subject -> Unit -> Chapter, triggering a randomized database fetch.
* **Live Preview Pane:** Real-time updating feed displaying generated question cards. Each card shows tags (e.g., Zoology, Hard), the question text containing LaTeX, 4 options (with correct highlighted green), and a button to swap/remove the question.

**5. Reports & Broadcast View (`/reports`)**

* **WhatsApp Broadcast Panel:** Selectable mock test dropdown, recipient list showing student names, parent phone numbers, and delivery status badges (Sent, Missing, Failed).
* **PDF Report Preview:** Split-screen panel rendering a professional diagnostic report preview detailing student performance breakdown and topic accuracy percentages.
