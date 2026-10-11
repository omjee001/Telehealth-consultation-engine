/*
 * Phase 13 — Redis Configuration
 *
 * WHAT IS REDIS?
 * Redis is an in-memory data store — it keeps data in RAM instead of on disk.
 * This makes it extremely fast (microseconds) compared to MongoDB (milliseconds).
 *
 * RAM vs DISK:
 *   RAM:  very fast, but limited capacity and data disappears on restart
 *   Disk: slower, but persistent and large capacity
 *
 * WHEN REDIS IS USEFUL:
 *   ✓ Caching: store frequently accessed data to avoid hitting the database
 *   ✓ Rate limiting: count API requests per user per minute
 *   ✓ Presence: track who is online (temporary, real-time data)
 *   ✓ Sessions: store short-lived session data
 *   ✓ Pub/Sub: coordinate between multiple servers
 *
 * WHEN REDIS IS UNNECESSARY:
 *   ✗ For data that must survive restart (use MongoDB)
 *   ✗ For complex queries (Redis has simple key-value operations)
 *   ✗ For small, single-server apps where in-memory is sufficient
 *
 * CACHE CONCEPTS:
 *   Cache hit:  data is found in Redis → return immediately (fast!)
 *   Cache miss: data is not in Redis → fetch from MongoDB → store in Redis for next time
 *   TTL:        Time-To-Live — how long data stays in cache before expiring
 *
 * OUR JUSTIFIED USE CASE:
 * Rate limiting for authentication endpoints (login, register).
 * This prevents brute-force attacks by limiting how many attempts
 * a single IP can make per time window.
 *
 * GRACEFUL FAILURE:
 * If Redis is unavailable, the application should still work.
 * Rate limiting will be less effective, but the core functionality
 * (authentication, messaging, etc.) must not break.
 */

import Redis from "ioredis";
import env from "./env.js";

let redisClient = null;
let redisReady = false;

/**
 * Create and return a Redis connection.
 * If Redis is not configured or unavailable, returns null.
 * The application must handle null gracefully.
 */
export function getRedisClient() {
  if (redisClient) return redisClient;

  if (!env.redisUrl) {
    console.log("[Redis] REDIS_URL not set — Redis features disabled.");
    return null;
  }

  try {
    redisClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Wait exponentially longer between retries, max 5 seconds
        const delay = Math.min(times * 200, 5000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`);
        return delay;
      },
      lazyConnect: true
    });

    redisClient.on("connect", () => {
      redisReady = true;
      console.log("[Redis] Connected successfully.");
    });

    redisClient.on("error", (error) => {
      redisReady = false;
      console.error("[Redis] Connection error:", error.message);
    });

    redisClient.on("close", () => {
      redisReady = false;
      console.log("[Redis] Connection closed.");
    });

    // Attempt connection
    redisClient.connect().catch((error) => {
      console.error("[Redis] Initial connection failed:", error.message);
      console.log("[Redis] Application will continue without Redis.");
    });

    return redisClient;
  } catch (error) {
    console.error("[Redis] Setup failed:", error.message);
    return null;
  }
}

/**
 * Check if Redis is currently available.
 */
export function isRedisReady() {
  return redisReady && redisClient !== null;
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisReady = false;
  }
}
