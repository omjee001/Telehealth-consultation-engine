/*
 * Phase 11 — Guest Access Page
 *
 * Provides temporary emergency access without full registration.
 * Guest token expires after 15 minutes by default.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api.js";

function GuestAccessPage() {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [guestInfo, setGuestInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await api.post("/guest/access", { name, reason });

      if (result.ok) {
        localStorage.setItem("token", result.data.token);
        setGuestInfo(result.data.data);
      } else {
        setError(result.data.message || "Failed to get guest access.");
      }
    } catch {
      setError("Network error.");
    }

    setIsSubmitting(false);
  }

  if (guestInfo) {
    return (
      <div className="page">
        <div className="auth-card">
          <div className="guest-banner">
            ⚠️ Guest Session — Limited access, expires at{" "}
            {new Date(guestInfo.expiresAt).toLocaleTimeString()}
          </div>
          <h1>Guest Access Granted</h1>
          <p>Welcome, {guestInfo.name}. You have temporary access.</p>
          <p className="text-muted">
            Your session will expire automatically. For full access, please{" "}
            <Link to="/register">create an account</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="auth-card">
        <h1>Emergency Guest Access</h1>
        <p className="subtitle">
          Need immediate help? Get temporary access without registering.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for emergency access</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief description of your situation"
              rows={3}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Get Temporary Access"}
          </button>
        </form>

        <p className="auth-footer">
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default GuestAccessPage;
