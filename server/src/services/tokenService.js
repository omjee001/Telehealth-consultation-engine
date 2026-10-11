/*
 * Phase 4 — Token Service
 *
 * WHAT IS A JWT?
 * A JSON Web Token is a small, signed piece of text with three parts
 * separated by dots:    header.payload.signature
 *
 *   header    → tells which signing algorithm was used (e.g. HS256)
 *   payload   → the actual data (userId, role, expiration time)
 *   signature → a cryptographic proof that the server created this token
 *
 * IMPORTANT SECURITY NOTE
 * The payload is only Base64-encoded, NOT encrypted.
 * Anyone who has the token can decode the payload and read it.
 * That is why we NEVER put passwords, medical data, or secrets inside a JWT.
 * We store only the minimum: userId and role.
 *
 * WHY IS IT USEFUL?
 * After login, the server gives the client a JWT.
 * The client sends it back with every future request (in the Authorization header).
 * The server verifies the signature to confirm the token is real and not tampered with.
 * This is "stateless authentication" — the server does not need to store session data
 * because the token itself carries the proof.
 *
 * EXPIRATION
 * Every token has an expiration time (e.g. 1 hour).
 * After that, the client must log in again to get a new token.
 * This limits damage if a token is stolen.
 */

import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Create a signed JWT for a verified user.
 * @param {object} user — a Mongoose user document (must have _id and role)
 * @returns {string} the signed JWT string
 */
export function generateToken(user) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }

  // Only include the minimum information the server needs to identify the user.
  const payload = {
    userId: user._id,
    role: user.role
  };

  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Verify and decode a JWT.
 * @param {string} token — the JWT string from the client
 * @returns {object} the decoded payload ({ userId, role, iat, exp })
 * @throws {JsonWebTokenError|TokenExpiredError} when the token is invalid or expired
 */
export function verifyToken(token) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }

  return jwt.verify(token, env.jwtSecret);
}

/**
 * Create a short-lived guest token (used later in Phase 11).
 */
export function generateGuestToken(guestProfile) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }

  const payload = {
    guestId: guestProfile._id,
    role: "guest"
  };

  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.guestJwtExpiresIn });
}
