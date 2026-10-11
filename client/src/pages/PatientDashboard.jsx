/*
 * Phase 6 — Patient Dashboard
 *
 * WHAT IS AN API CALL IN REACT?
 * When a component needs data from the backend, it uses fetch (via our api service).
 * We usually do this inside a useEffect hook, which runs code after the component
 * renders for the first time.
 *
 * The flow is:
 *   Component renders → useEffect runs → api.get() → backend responds → setState → re-render
 *
 * Phase 7 will add consultation functionality here.
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import ChatWindow from "../components/ChatWindow.jsx";
import { getSocket } from "../services/socket.js";

function PatientDashboard() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [reason, setReason] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Load consultations and doctors when the page opens
  useEffect(() => {
    loadConsultations();
    loadDoctors();
  }, []);

  // Track online users
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("getOnlineUsers", (response) => {
      if (response && response.users) {
        setOnlineUsers(new Set(response.users));
      }
    });

    const handleUserOnline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    const handleUserOffline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, []);

  async function loadConsultations() {
    const result = await api.get("/consultations/my");
    if (result.ok) {
      setConsultations(result.data.data || []);
    }
  }

  async function loadDoctors() {
    const result = await api.get("/users?role=doctor");
    if (result.ok) {
      setDoctors(result.data.data || []);
    }
  }

  async function handleRequestConsultation(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedDoctor) {
      setError("Please select a doctor.");
      return;
    }

    const result = await api.post("/consultations", {
      doctor: selectedDoctor,
      reason
    });

    if (result.ok) {
      setMessage("Consultation requested successfully!");
      setReason("");
      setSelectedDoctor("");
      loadConsultations();
    } else {
      setError(result.data.message || "Failed to request consultation.");
    }
  }

  return (
    <div className="page">
      <h1>Patient Dashboard</h1>
      <p className="subtitle">Welcome! Manage your consultations here.</p>

      {/* Request a new consultation */}
      <section className="card">
        <h2>Request Consultation</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleRequestConsultation}>
          <div className="form-group">
            <label htmlFor="doctor">Select Doctor</label>
            <select
              id="doctor"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">-- Choose a doctor --</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.fullName} ({doc.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason (optional)</label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief description of your concern"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Request Consultation
          </button>
        </form>
      </section>

      {/* List of consultations */}
      <section className="card">
        <h2>My Consultations</h2>
        {consultations.length === 0 ? (
          <p className="text-muted">No consultations yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c._id}>
                    <td>
                      {c.doctor?.fullName || "—"}
                      {c.doctor && (
                        <span 
                          className={`online-indicator ${onlineUsers.has(c.doctor._id) ? "online" : "offline"}`} 
                          title={onlineUsers.has(c.doctor._id) ? "Online" : "Offline"}
                        />
                      )}
                    </td>
                    <td>{c.reason || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      {(c.status === "accepted" || c.status === "active") && (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => setActiveChatId(c._id)}
                        >
                          Chat
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Active Chat Window */}
      {activeChatId && (
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Consultation Chat</h2>
            <button className="btn btn-sm btn-outline" onClick={() => setActiveChatId(null)}>
              Close Chat
            </button>
          </div>
          <ChatWindow consultationId={activeChatId} currentUserId={user.userId} />
        </section>
      )}
    </div>
  );
}

export default PatientDashboard;
