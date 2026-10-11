/*
 * Phase 5 — Authorization Middleware (RBAC)
 *
 * AUTHENTICATION vs AUTHORIZATION
 *
 * Authentication (Phase 4):  "Who are you?"
 *   → The authenticate middleware answers this by verifying the JWT.
 *   → After it runs, request.user contains { userId, role }.
 *
 * Authorization (Phase 5):   "What are you allowed to do?"
 *   → This authorize middleware answers this by checking the user's role.
 *   → It ensures the user has the right role to access a specific endpoint.
 *
 * HOW THIS MIDDLEWARE WORKS
 *
 * authorize("doctor", "admin") returns a middleware function.
 * That function checks if request.user.role is "doctor" or "admin".
 * If yes → the request continues.
 * If no  → the request is rejected with 403 Forbidden.
 *
 * WHY THE ROLE COMES FROM THE JWT, NOT THE REQUEST BODY
 *
 * If we read the role from request.body, any user could change it to "admin".
 * Instead, the role is embedded in the signed JWT token.
 * Only the server can create valid tokens, so the role is trustworthy.
 * A user cannot promote themselves by modifying the request.
 *
 * MIDDLEWARE ORDER MATTERS
 *
 * router.get("/admin/dashboard", authenticate, authorize("admin"), handler)
 *
 *   1. authenticate runs first → verifies JWT → sets request.user
 *   2. authorize("admin") runs next → checks if request.user.role === "admin"
 *   3. handler runs last → returns the actual data
 *
 * If authenticate fails, authorize never runs.
 * If authorize fails, the handler never runs.
 * This is the "chain of checkpoints" pattern.
 */

/**
 * Creates a middleware that checks if the authenticated user has one of the allowed roles.
 * @param  {...string} allowedRoles — roles that are permitted (e.g. "admin", "doctor")
 * @returns {Function} Express middleware
 */
export default function authorize(...allowedRoles) {
  return (request, response, next) => {
    // authenticate middleware must run before authorize.
    // If request.user is missing, authentication didn't happen.
    if (!request.user) {
      return response.status(401).json({
        error: "Authentication required",
        message: "You must be logged in before authorization can be checked."
      });
    }

    // Check if the user's role is in the list of allowed roles.
    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        error: "Access denied",
        message: `This action requires one of these roles: ${allowedRoles.join(", ")}. Your role is: ${request.user.role}.`
      });
    }

    // User has a permitted role — continue to the next middleware or handler.
    return next();
  };
}
