/*
 * Phase 6 — Protected Route Component
 *
 * This component guards routes that require authentication.
 * If the user is not logged in, it redirects them to /login.
 * If the user doesn't have the right role, it redirects to their dashboard.
 *
 * HOW IT WORKS:
 * <ProtectedRoute allowedRoles={["patient"]}>
 *   <PatientDashboard />
 * </ProtectedRoute>
 *
 * 1. Check if user is logged in → if not, redirect to /login
 * 2. Check if user's role is in allowedRoles → if not, redirect to home
 * 3. If both pass, render the children (the actual page)
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Still checking if the user is logged in
  if (loading) {
    return <div className="page"><p>Loading...</p></div>;
  }

  // Not logged in → go to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → go to home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // All checks passed → show the actual page
  return children;
}

export default ProtectedRoute;
