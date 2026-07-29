import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { ENV } from './config/env';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Strip trailing slash from FRONTEND_URL so comparison is always clean.
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

// Static allowlist: production URL + local dev ports.
const allowedOrigins: string[] = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean); // removes empty string if FRONTEND_URL is unset

// Vercel preview URL pattern scoped to THIS project only.
//
// Vercel project slug: "erp-crm-operations-portal-fundsroom"
//   (derived from the repo/project name on Vercel's dashboard)
//
// Production URL : https://erp-crm-operations-portal-fundsroom.vercel.app
//   → prefix match: "erp-crm-operations-portal-fundsroom", suffix: "" (zero length) ✅
//
// Preview URL    : https://erp-crm-operations-portal-fundsroom-infotech-assignm-dssgjwwpf.vercel.app
//   → prefix match: "erp-crm-operations-portal-fundsroom", suffix: "-infotech-assignm-dssgjwwpf" ✅
//
// Other projects : https://some-other-project.vercel.app
//   → prefix does NOT match → ❌ blocked
//
// The regex requires https, anchors both ends, and allows only [a-z0-9-] in the suffix
// so no injection or bypass is possible via crafted origin headers.
const vercelPreviewPattern =
  /^https:\/\/erp-crm-operations-portal-fundsroom[a-z0-9-]*\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser callers (curl, Postman, server-to-server, Render health checks).
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalized) || vercelPreviewPattern.test(normalized)) {
        return callback(null, true);
      }

      // Log the exact rejected origin so Render logs show it without guesswork.
      console.warn(`[CORS] Blocked origin: ${normalized}`);
      return callback(new Error('Not allowed by CORS'));
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
