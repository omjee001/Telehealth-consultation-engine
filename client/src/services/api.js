/*
 * Phase 6 — API Service
 *
 * WHAT IS AN API SERVICE?
 * Instead of writing fetch() calls in every component, we create ONE place
 * that handles all communication with the backend. This keeps our components
 * clean and avoids repeating the same code everywhere.
 *
 * WHAT THIS FILE DOES:
 * 1. Sets the base URL for all API calls (our Express backend)
 * 2. Automatically adds the JWT token to every request if the user is logged in
 * 3. Automatically converts request/response data to/from JSON
 * 4. Provides simple functions: api.get(), api.post(), etc.
 */

const API_BASE = "http://localhost:5000/api";

/**
 * Make an API request to our Express backend.
 * @param {string} path — e.g. "/auth/login"
 * @param {object} options — fetch options (method, body, etc.)
 * @returns {Promise<{status: number, data: object, ok: boolean}>}
 */
async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  // If the user is logged in, attach their JWT to every request
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
    ok: response.ok
  };
}

const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" })
};

export default api;
