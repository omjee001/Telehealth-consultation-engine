/*
 * Phase 4 + Phase 5 — Protected Routes
 *
 * These routes demonstrate JWT authentication and role-based authorization.
 *
 * HOW MIDDLEWARE CHAINING WORKS:
 *   router.get("/me", authenticate, handler)
 *
 * Express runs authenticate first.
 * If the token is valid, authenticate calls next() and the handler runs.
 * If the token is invalid, authenticate sends a 401 response and stops.
 *
 * For role-based routes:
 *   router.get("/admin/dashboard", authenticate, authorize("admin"), handler)
 *
 * authenticate runs first → then authorize checks the role → then the handler runs.
 * Each middleware is a checkpoint. If any checkpoint fails, the request stops.
 *
 * PHASE 5 ROLE DESIGN (educational):
 *   Patient  → can access patient-level information
 *   Doctor   → can access doctor-level clinical data
 *   Admin    → can access administrative controls
 *
 * These are reasonable educational permissions, not a production medical system design.
 */

import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";

const protectedRouter = Router();

// ──────────────────────────────────────────────
// Phase 4: Requires any valid JWT (any role)
// ──────────────────────────────────────────────
protectedRouter.get("/me", authenticate, (request, response) => {
  response.status(200).json({
    message: "You are authenticated.",
    data: {
      userId: request.user.userId,
      role: request.user.role
    }
  });
});

// ──────────────────────────────────────────────
// Phase 5: Role-based endpoints
// ──────────────────────────────────────────────

// Patient dashboard — accessible by patients and admins
protectedRouter.get(
  "/patient/dashboard",
  authenticate,
  authorize("patient", "admin"),
  (request, response) => {
    response.status(200).json({
      message: "Welcome to the patient dashboard.",
      data: {
        userId: request.user.userId,
        role: request.user.role,
        features: [
          "View your consultations",
          "Request new consultation",
          "Send messages to doctor"
        ]
      }
    });
  }
);

// Doctor dashboard — accessible by doctors and admins
protectedRouter.get(
  "/doctor/dashboard",
  authenticate,
  authorize("doctor", "admin"),
  (request, response) => {
    response.status(200).json({
      message: "Welcome to the doctor dashboard.",
      data: {
        userId: request.user.userId,
        role: request.user.role,
        features: [
          "View consultation requests",
          "Accept consultations",
          "Communicate with patients"
        ]
      }
    });
  }
);

// Admin dashboard — accessible only by admins
protectedRouter.get(
  "/admin/dashboard",
  authenticate,
  authorize("admin"),
  (request, response) => {
    response.status(200).json({
      message: "Welcome to the admin dashboard.",
      data: {
        userId: request.user.userId,
        role: request.user.role,
        features: [
          "Manage all users",
          "View system statistics",
          "Configure application settings"
        ]
      }
    });
  }
);

export default protectedRouter;
