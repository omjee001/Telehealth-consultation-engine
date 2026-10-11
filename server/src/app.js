/*
 * Phase 14 — Express Application Setup (Security Hardened)
 *
 * SECURITY LAYERS ADDED:
 * 1. helmet — sets secure HTTP headers (prevents clickjacking, XSS, etc.)
 * 2. Rate limiting — prevents brute-force and DDoS attacks
 * 3. CORS — controls which frontend can call this API
 * 4. JSON body parsing with size limits
 *
 * The order of middleware matters:
 *   Security headers → rate limiting → CORS → body parsing → routes → error handling
 */

import cors from "cors";
import express from "express";
import helmet from "helmet";
import env from "./config/env.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import { generalLimiter, authLimiter, guestLimiter } from "./middleware/rateLimiter.js";
import authRouter from "./routes/authRoutes.js";
import consultationRouter from "./routes/consultationRoutes.js";
import demoRouter from "./routes/demoRoutes.js";
import guestRouter from "./routes/guestRoutes.js";
import healthRouter from "./routes/healthRoutes.js";
import protectedRouter from "./routes/protectedRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();

// Phase 14: Security headers (helmet adds many headers in one call)
// - X-Content-Type-Options: nosniff (prevents MIME-type sniffing)
// - X-Frame-Options: DENY (prevents clickjacking)
// - Strict-Transport-Security (enforces HTTPS)
// - X-XSS-Protection (browser XSS filter)
app.use(helmet());

// Phase 14: General rate limiting for all API endpoints
app.use(generalLimiter);

// This tells the browser which frontend is allowed to call this API.
app.use(cors({ origin: env.clientUrl }));

// This lets Express read JSON sent in request bodies.
// limit: prevents excessively large payloads (Phase 14 security)
app.use(express.json({ limit: "1mb" }));

// ── Routes ──

app.use("/api/health", healthRouter);
app.use("/api/demo", demoRouter);

// Phase 14: Auth routes have stricter rate limiting (brute-force protection)
app.use("/api/auth", authLimiter, authRouter);

// Phase 11: Guest access with strict rate limiting
app.use("/api/guest", guestLimiter, guestRouter);

app.use("/api/users", userRouter);
app.use("/api/consultations", consultationRouter);
app.use("/api/protected", protectedRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
