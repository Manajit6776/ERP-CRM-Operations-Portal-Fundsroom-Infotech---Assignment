import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { ENV } from './config/env';

const app = express();

// CORS — strip trailing slash so both https://x.vercel.app and https://x.vercel.app/ work
const allowedOrigin = (ENV.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health checks — /health (legacy) and /api/health (canonical, use this to verify deploys)
const healthPayload = () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  service: 'Mini ERP + CRM Operations Portal API'
});
app.get('/health', (_req, res) => { res.status(200).json(healthPayload()); });
app.get('/api/health', (_req, res) => { res.status(200).json(healthPayload()); });

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Requested endpoint not found' } });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
