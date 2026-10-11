/*
 * Phase 6 — Navbar Component
 *
 * WHAT IS A COMPONENT?
 * A component is a reusable piece of UI. Think of it like a custom HTML tag.
 * Instead of writing the same navigation HTML everywhere, we write it once
 * as <Navbar /> and use it wherever we need it.
 *
 * WHAT ARE PROPS?
 * Props are like function arguments for components. The parent component
 * can pass data to a child component through props.
 * Here, Navbar doesn't use props directly — it reads from AuthContext instead.
 *
 * CONDITIONAL RENDERING:
 * {user ? <ShowThis /> : <ShowThat />}
 * This is like an if-else: if user exists, show the first thing.
 * If user is null, show the second thing.
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Telehealth
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <span className="navbar-role">{user.role}</span>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
