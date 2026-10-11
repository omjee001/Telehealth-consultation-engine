/*
 * Phase 6 — Login Page
 *
 * WHAT ARE EVENTS?
 * Events are things that happen in the browser: a button click, a form submit,
 * typing in an input field. React lets us "listen" for these events and run
 * code when they happen.
 *
 * onChange → runs every time the user types a character
 * onSubmit → runs when the form is submitted
 * event.preventDefault() → stops the browser from reloading the page
 *
 * WHAT ARE FORMS IN REACT?
 * In React, form inputs are "controlled" — their values come from state.
 * Every keystroke updates the state, and the state feeds back into the input.
 * This gives React full control over what the user sees and types.
 *
 * Flow: user types → onChange fires → setState updates → input re-renders
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function LoginPage() {
  // State for each form field
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // This function runs when the form is submitted
  async function handleSubmit(event) {
    // Prevent the browser from reloading the page (default form behavior)
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="page">
      <div className="auth-card">
        <h1>Login</h1>
        <p className="subtitle">Sign in to your Telehealth account</p>

        {/* Conditional rendering: show error only if it exists */}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
