/*
 * Phase 12 — Background Cleanup Worker
 *
 * WHAT IS A BACKGROUND WORKER?
 * A background worker is a process that runs periodic tasks automatically,
 * without being triggered by user requests. Think of it like a janitor
 * who cleans up the building every night when nobody's around.
 *
 * WHY NOT CLEAN UP DURING USER REQUESTS?
 * If we cleaned up expired data during a normal API request, that request
 * would be slower. The user didn't ask for cleanup — they asked for data.
 * Cleanup should happen in the background, on a schedule.
 *
 * RETENTION POLICY:
 *   1. Guest profiles: expired OR inactive for > 24 hours → delete
 *   2. Cancelled consultations older than 30 days → archive/delete
 *   3. We do NOT delete active consultations or completed ones with messages
 *      (medical data has value and should be retained)
 *
 * WHAT IF THE WORKER CRASHES?
 * The worker is designed to be "crash-safe":
 *   - Each cleanup operation is independent
 *   - If one fails, the others still run
 *   - Failed operations are logged but don't crash the process
 *   - The next scheduled run will retry
 *
 * MONGODB TTL INDEXES:
 * MongoDB supports TTL (Time-To-Live) indexes that automatically delete
 * documents after a specified time. For example:
 *   guestProfileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
 *
 * TTL indexes are simpler but less flexible:
 *   ✓ Good for: simple time-based deletion (like expired sessions)
 *   ✗ Bad for: complex conditions (like "only delete if no messages exist")
 *
 * We use a worker because our cleanup logic has conditions that TTL can't handle.
 */

import GuestProfile from "../models/GuestProfile.js";
import Consultation from "../models/Consultation.js";
import Message from "../models/Message.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

/**
 * Remove expired guest profiles.
 * A guest profile is eligible for removal when:
 *   - Its expiresAt has passed, OR
 *   - It's been inactive for more than 24 hours
 */
async function cleanupGuestProfiles() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - ONE_DAY_MS);

  const result = await GuestProfile.deleteMany({
    $or: [
      { expiresAt: { $lt: now } },
      { isActive: false, updatedAt: { $lt: oneDayAgo } }
    ]
  });

  return result.deletedCount;
}

/**
 * Remove cancelled consultations older than 30 days.
 * We only delete cancelled ones — completed consultations have medical value.
 */
async function cleanupStaleConsultations() {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const staleConsultations = await Consultation.find({
    status: "cancelled",
    updatedAt: { $lt: thirtyDaysAgo }
  }).select("_id");

  if (staleConsultations.length === 0) return 0;

  const ids = staleConsultations.map((c) => c._id);

  // Delete associated messages first
  await Message.deleteMany({ consultation: { $in: ids } });
  const result = await Consultation.deleteMany({ _id: { $in: ids } });

  return result.deletedCount;
}

/**
 * Run all cleanup tasks.
 * Each task is independent — if one fails, the others still run.
 */
export async function runCleanup() {
  const results = { guestProfiles: 0, consultations: 0, errors: [] };

  try {
    results.guestProfiles = await cleanupGuestProfiles();
  } catch (error) {
    results.errors.push(`Guest cleanup failed: ${error.message}`);
    console.error("[Worker] Guest cleanup error:", error.message);
  }

  try {
    results.consultations = await cleanupStaleConsultations();
  } catch (error) {
    results.errors.push(`Consultation cleanup failed: ${error.message}`);
    console.error("[Worker] Consultation cleanup error:", error.message);
  }

  console.log(
    `[Worker] Cleanup complete. Guests removed: ${results.guestProfiles}, ` +
    `Consultations removed: ${results.consultations}, ` +
    `Errors: ${results.errors.length}`
  );

  return results;
}

/**
 * Start the cleanup worker on a schedule.
 * @param {number} intervalMs — how often to run (default: every hour)
 */
export function startCleanupWorker(intervalMs = 60 * 60 * 1000) {
  console.log(`[Worker] Cleanup worker started (interval: ${intervalMs / 1000}s)`);

  // Run immediately on start
  runCleanup().catch((error) => {
    console.error("[Worker] Initial cleanup failed:", error.message);
  });

  // Then run on schedule
  const intervalId = setInterval(() => {
    runCleanup().catch((error) => {
      console.error("[Worker] Scheduled cleanup failed:", error.message);
    });
  }, intervalMs);

  // Allow the process to exit even if the interval is running
  if (intervalId.unref) {
    intervalId.unref();
  }

  return intervalId;
}
