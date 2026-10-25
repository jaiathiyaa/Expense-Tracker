import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import transactionRoutes from "./routes/transactions.route";
import userRoutes from "./routes/user.route";
import authRoutes from "./routes/auth.route";
import dashboardRouter from "./routes/dashboard.route";
import assistantRoutes from "./routes/assistant.route";
import { getHealth } from "./controllers/health.controller";

const app = express();

// Configure proxy trust if behind reverse proxy (Nginx, Cloudflare, AWS ALB)
if (process.env.TRUST_PROXY) {
  const trustVal = process.env.TRUST_PROXY.trim().toLowerCase();
  app.set('trust proxy', trustVal === 'true' ? 1 : Number(trustVal) || trustVal);
}

// Configurable CORS allowlist:
// Allows web origins from CORS_ORIGIN environment variable.
// Always allows native mobile requests (which send no Origin header).
const configuredCorsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = configuredCorsOrigin
  ? configuredCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : null;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Mobile apps, curl, and server-side requests have no Origin header
    if (!origin) {
      return callback(null, true);
    }

    // If wildcard or unconfigured, allow all
    if (!allowedOrigins || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-idempotency-key'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Readiness and liveness probe
app.get('/api/health', getHealth);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/assistant', assistantRoutes);
app.use('/api', transactionRoutes);
app.use('/api', userRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Expense Tracker API is running!" });
});



export default app;