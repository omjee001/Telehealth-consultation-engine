/*
 * Phase 4 — Authentication Middleware
 *
 * WHAT IS MIDDLEWARE?
 * Middleware is a function that runs between receiving a request and sending a response.
 * Express runs middleware in order, like a chain of security checkpoints.
 *
 * This middleware does ONE job: verify the JWT.
 *
 * HOW IT WORKS
 * 1. The client sends:  Authorization: Bearer eyJhbGci...
 * 2. This middleware extracts the token after "Bearer ".
 * 3. It verifies the token signature and checks expiration.
 * 4. If valid, it attaches the user info (userId, role) to `request.user`.
 * 5. The next middleware or route handler can then trust `request.user`.
 *
 * WHY REQUEST.USER IS TRUSTED
 * Because the data comes from our verified JWT, not from user input.
 * A user cannot modify their role by changing the request body —
 * the role is embedded in the signed token, and any tampering
 * invalidates the signature.
 */

import { verifyToken } from "../services/tokenService.js";

export default function authenticate(request, response, next) {
  // Step 1: Look for the Authorization header
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({
      error: "Authentication required",
      message: "No token provided. Send a valid JWT in the Authorization header."
    });
  }

  // Step 2: Extract the token (everything after "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // Step 3: Verify the token — this checks the signature AND expiration
    const decoded = verifyToken(token);

    // Step 4: Attach trusted user information to the request.
    // Every route handler after this middleware can use request.user.
    request.user = {
      userId: decoded.userId || decoded.guestId,
      role: decoded.role
    };

    // If this is a guest token, mark it so other middleware can check
    if (decoded.guestId) {
      request.user.isGuest = true;
      request.user.guestId = decoded.guestId;
    }

    // Step 5: Continue to the next middleware or route handler
    return next();
  } catch (error) {
    // Token verification failed
    if (error.name === "TokenExpiredError") {
      return response.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again."
      });
    }

    return response.status(401).json({
      error: "Invalid token",
      message: "The provided token is not valid."
    });
  }
}
