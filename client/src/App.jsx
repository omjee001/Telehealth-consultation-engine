/*
 * Phase 6 — App Component (Root)
 *
 * WHAT IS REACT ROUTER?
 * In a normal website, clicking a link loads a new HTML page from the server.
 * In React, we have a "Single Page Application" (SPA) — one HTML page.
 * React Router changes what's shown on screen without reloading the page.
 *
 * <BrowserRouter> enables client-side routing
 * <Routes> contains all the route definitions
 * <Route path="/login" element={<LoginPage />} /> means:
 *   "When the URL is /login, show the LoginPage component"
 *
 * WHAT IS THE APP COMPONENT?
 * App is the root component — the top of the component tree.
 * Every other component is a child or grandchild of App.
 * It sets up routing, wraps everything in AuthProvider (for context),
 * and includes the Navbar that appears on every page.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import GuestAccessPage from "./pages/GuestAccessPage.jsx";

// This component redirects users to their role-appropriate dashboard
function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;

  // Redirect to the correct dashboard based on role
  switch (user.role) {
    case "patient":
      return <Navigate to="/patient" replace />;
    case "doctor":
      return <Navigate to="/doctor" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public routes — anyone can access */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/guest" element={<GuestAccessPage />} />

          {/* Home — redirects to role-appropriate dashboard */}
          <Route path="/" element={<HomePage />} />

          {/* Protected routes — require authentication + correct role */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
