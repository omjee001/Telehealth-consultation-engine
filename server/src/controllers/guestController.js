/*
 * Phase 11 — Guest Controller
 *
 * GUEST ACCESS FLOW:
 *   Guest → Request guest access (name, reason)
 *   → Create temporary guest identity in MongoDB
 *   → Issue short-lived JWT (15 minutes)
 *   → Allow limited consultation functionality
 *   → Token expires → Guest becomes invalid
 *
 * DIFFERENCES FROM NORMAL LOGIN:
 *   Normal user: full account, long-lived token, full permissions
 *   Guest user:  temporary profile, short-lived token, limited permissions
 *
 * SECURITY:
 *   - Guests CANNOT become Admin
 *   - Guests CANNOT access arbitrary users or consultations
 *   - Guests have a short token expiration
 *   - Guest profiles are cleaned up by the background worker
 */

import GuestProfile from "../models/GuestProfile.js";
import { generateGuestToken } from "../services/tokenService.js";
import env from "../config/env.js";

export async function requestGuestAccess(request, response, next) {
  try {
    const { name, reason } = request.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return response.status(400).json({
        error: "Invalid name",
        message: "Guest name must be at least 2 characters."
      });
    }

    // Calculate expiration time
    const expiresInMs = parseExpiration(env.guestJwtExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Create the guest profile
    const guest = await GuestProfile.create({
      name: name.trim(),
      reason: reason?.trim() || "",
      expiresAt
    });

    // Generate a short-lived JWT for the guest
    const token = generateGuestToken(guest);

    return response.status(201).json({
      message: "Guest access granted.",
      token,
      data: {
        _id: guest._id,
        name: guest.name,
        role: "guest",
        expiresAt: guest.expiresAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

// Parse expiration strings like "15m", "1h" into milliseconds
function parseExpiration(str) {
  const match = str.match(/^(\d+)(m|h|d|s)$/);
  if (!match) return 15 * 60 * 1000; // default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}
