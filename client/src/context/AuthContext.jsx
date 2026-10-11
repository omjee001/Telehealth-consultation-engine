/*
 * Phase 6 — Authentication Context
 *
 * WHAT IS CONTEXT?
 * React components normally pass data through "props" (parent → child).
 * But authentication data (user info, login/logout functions) is needed
 * by MANY components at different levels. Passing props through every
 * level is tedious — this is called "prop drilling".
 *
 * React Context solves this: it creates a "global" data store that any
 * component can access directly, without props being passed through
 * intermediate components.
 *
 * WHAT IS STATE?
 * State is data that can change over time. When state changes, React
 * automatically re-renders (redraws) the components that use it.
 *
 * useState(null) creates a piece of state that starts as null.
 * setUser(newUser) updates that state and triggers a re-render.
 *
 * WHAT THIS FILE DOES:
 * 1. Stores the current user and token in state
 * 2. Provides login(), register(), and logout() functions
 * 3. Saves/restores the token from localStorage so login survives page refresh
 * 4. Makes all of this available to any component via useAuth()
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";
import { connectSocket, disconnectSocket } from "../services/socket.js";

// Step 1: Create the context — think of it as a named container
const AuthContext = createContext(null);

// Step 2: Create a provider component that wraps the entire app
export function AuthProvider({ children }) {
  // "State" — data that React tracks and re-renders when it changes
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // "Effect" — code that runs after the component renders.
  // This checks if there's a saved token and loads the user info.
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const result = await api.get("/protected/me");
          if (result.ok) {
            setUser({ userId: result.data.data.userId, role: result.data.data.role });
            connectSocket(token);
          } else {
            // Token is invalid or expired — clean up
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            disconnectSocket();
          }
        } catch {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
          disconnectSocket();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  // Login: send credentials to backend, save token if successful
  async function login(email, password) {
    const result = await api.post("/auth/login", { email, password });

    if (result.ok) {
      localStorage.setItem("token", result.data.token);
      setToken(result.data.token);
      setUser({ userId: result.data.data._id, role: result.data.data.role });
      connectSocket(result.data.token);
      return { success: true };
    }

    return { success: false, message: result.data.message || "Login failed." };
  }

  // Register: create account, then auto-login
  async function register(fullName, email, password, role) {
    const result = await api.post("/auth/register", { fullName, email, password, role });

    if (result.ok) {
      // Auto-login after successful registration
      return login(email, password);
    }

    const message = result.data.message || result.data.messages?.join(", ") || "Registration failed.";
    return { success: false, message };
  }

  // Logout: clear everything
  function logout() {
    disconnectSocket();
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  // Step 3: Provide the state and functions to all children
  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Step 4: Custom hook — components call useAuth() to access the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
