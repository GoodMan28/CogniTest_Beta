import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import testRoutes from './routes/testRoutes';
import templateRoutes from './routes/templateRoutes';
import evaluationRoutes from './routes/evaluationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import customTestRoutes from './routes/customTestRoutes';
import reportRoutes from './routes/reportRoutes';
import instituteRoutes from './routes/instituteRoutes';
import studentRoutes from './routes/studentRoutes';
import ingestionRoutes from './routes/ingestionRoutes';
import questionRoutes from './routes/questionRoutes';
import authRoutes from './routes/authRoutes';

import path from 'path';

dotenv.config();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.status(200).send('CogniTest Backend is running properly!');
});

connectDB();

app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/evaluation', evaluationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/custom-test', customTestRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/institute', instituteRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/ingestion', ingestionRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/auth', authRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
