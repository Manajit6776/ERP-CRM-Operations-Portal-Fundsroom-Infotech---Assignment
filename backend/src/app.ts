import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { ENV } from './config/env';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Static allowlist: production frontend + local dev ports
const allowedOrigins: string[] = [
  ENV.FRONTEND_URL,          // e.g. https://erp-crm-frontend.vercel.app
  'http://localhost:5173',   // Vite default
  'http://localhost:3000',   // alternate dev port
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, '')); // strip trailing slashes

// Vercel generates preview URLs as:
//   https://<project-slug>-<git-hash>-<team-slug>.vercel.app
//   https://<project-slug>-<git-hash>.vercel.app
//
// Our project slug starts with "erp-crm-operations-portal-fundsroom-infotech-assignm"
// (Vercel truncates long names; confirmed preview format from the dashboard).
// The regex anchors both ends so it cannot match other projects on *.vercel.app.
const vercelPreviewPattern =
  /^https:\/\/erp-crm-operations-portal-fundsroom-infotech-assignm[a-z0-9-]*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser callers (curl, Render health-checks, server-to-server)
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalized) || vercelPreviewPattern.test(normalized)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  })
);

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
