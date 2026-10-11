/*
 * Phase 13 + Phase 14 — Rate Limiter Middleware
 *
 * WHAT IS RATE LIMITING?
 * Rate limiting prevents abuse by restricting how many requests
 * a client can make in a given time window.
 *
 * WHY IT MATTERS FOR SECURITY:
 *   Without rate limiting, an attacker could:
 *   - Try millions of passwords (brute force)
 *   - Send thousands of registration requests (spam)
 *   - Overwhelm the server (denial of service)
 *
 * HOW IT WORKS:
 *   Each request from an IP increments a counter.
 *   If the counter exceeds the limit, the request is rejected with 429 Too Many Requests.
 *   After the time window passes, the counter resets.
 *
 * REDIS-BACKED vs IN-MEMORY:
 *   In-memory: simple, works for single server, resets on restart
 *   Redis: shared across multiple servers, survives restart
 *   We try Redis first, fall back to in-memory if unavailable.
 */

import rateLimit from "express-rate-limit";
import { getRedisClient, isRedisReady } from "../config/redis.js";

// Note: For this educational app, we keep the rate limiting in-memory.
// To use Redis backing, you would install the `rate-limit-redis` package
// and pass it as the `store` option to `rateLimit`, using the client
// returned by `getRedisClient()`.


// General API rate limiter — generous limits for normal usage
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: "You have exceeded the rate limit. Please try again later."
  }
});

// Strict rate limiter for auth endpoints (login, register)
// Brute-force protection: 20 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts",
    message: "Too many login/register attempts. Please try again in 15 minutes."
  }
});

// Very strict limiter for guest access
export const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many guest requests",
    message: "Too many guest access attempts. Please try again later."
  }
});
