/*
 * Phase 6 — Admin Dashboard
 *
 * Shows system-wide information for administrators.
 * Admins can see all users and all consultations.
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [usersResult, consultationsResult] = await Promise.all([
      api.get("/users"),
      api.get("/consultations")
    ]);

    if (usersResult.ok) setUsers(usersResult.data.data || []);
    if (consultationsResult.ok) setConsultations(consultationsResult.data.data || []);
  }

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <p className="subtitle">System overview and management.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{users.filter(u => u.role === "patient").length}</div>
          <div className="stat-label">Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{users.filter(u => u.role === "doctor").length}</div>
          <div className="stat-label">Doctors</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{consultations.length}</div>
          <div className="stat-label">Consultations</div>
        </div>
      </div>

      <section className="card">
        <h2>All Users</h2>
        {users.length === 0 ? (
          <p className="text-muted">No users registered yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>All Consultations</h2>
        {consultations.length === 0 ? (
          <p className="text-muted">No consultations yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c._id}>
                    <td>{c.patient?.fullName || "—"}</td>
                    <td>{c.doctor?.fullName || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
