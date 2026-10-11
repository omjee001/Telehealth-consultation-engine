/*
 * Phase 6 — Doctor Dashboard
 *
 * Shows consultation requests assigned to this doctor.
 * Doctors can accept or complete consultations.
 * Phase 7 will expand this with the full consultation lifecycle.
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import ChatWindow from "../components/ChatWindow.jsx";
import { getSocket } from "../services/socket.js";

function DoctorDashboard() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    loadConsultations();
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

  async function handleUpdateStatus(consultationId, newStatus) {
    setError("");
    setMessage("");

    const result = await api.patch(`/consultations/${consultationId}/status`, {
      status: newStatus
    });

    if (result.ok) {
      setMessage(`Consultation ${newStatus} successfully!`);
      loadConsultations();
    } else {
      setError(result.data.message || "Failed to update consultation.");
    }
  }

  return (
    <div className="page">
      <h1>Doctor Dashboard</h1>
      <p className="subtitle">Manage your patient consultations.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card">
        <h2>Consultation Requests</h2>
        {consultations.length === 0 ? (
          <p className="text-muted">No consultations assigned to you yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
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
                      {c.patient?.fullName || "—"}
                      {c.patient && (
                        <span 
                          className={`online-indicator ${onlineUsers.has(c.patient._id) ? "online" : "offline"}`} 
                          title={onlineUsers.has(c.patient._id) ? "Online" : "Offline"}
                        />
                      )}
                    </td>
                    <td>{c.reason || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      {c.status === "requested" && (
                        <button
                          onClick={() => handleUpdateStatus(c._id, "accepted")}
                          className="btn btn-sm btn-primary"
                        >
                          Accept
                        </button>
                      )}
                      {(c.status === "accepted" || c.status === "active") && (
                        <>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => setActiveChatId(c._id)}
                            style={{ marginRight: '0.5rem' }}
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(c._id, "completed")}
                            className="btn btn-sm btn-outline"
                          >
                            Complete
                          </button>
                        </>
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

export default DoctorDashboard;
