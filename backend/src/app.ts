import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { ENV } from './config/env';

const app = express();

// Middlewares
app.use(cors({
  origin: true, // Allow frontend origin or configure from env
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Mini ERP + CRM Operations Portal API' });
});

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Requested endpoint not found' } });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
