/*
 * Phase 9 — Message Handler
 *
 * REAL-TIME MESSAGE FLOW:
 *   Patient sends message event
 *   → Server receives event
 *   → Server identifies sender (from authenticated socket)
 *   → Server identifies consultation and validates authorization
 *   → Message validated (not empty, not too long)
 *   → Message persisted to MongoDB FIRST
 *   → Message emitted to consultation room
 *   → Doctor's/Patient's React UI updates in real-time
 *
 * ROOMS:
 * Socket.io "rooms" are like group chats. When a user joins a consultation,
 * their socket joins a room named "consultation:<id>". Any message emitted
 * to that room reaches all connected participants — no manual routing needed.
 *
 * AUTHORIZATION:
 * A user can only send/receive messages in consultations they belong to.
 * The server checks the consultation's patient and doctor fields against
 * the authenticated user's ID (from the JWT, not from user input).
 */

import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import Message from "../models/Message.js";

export function setupMessageHandler(io, socket) {
  const userId = socket.user.userId;

  // ── Join a consultation room ──
  socket.on("joinConsultation", async (consultationId, callback) => {
    try {
      if (!mongoose.isValidObjectId(consultationId)) {
        return callback?.({ error: "Invalid consultation ID." });
      }

      const consultation = await Consultation.findById(consultationId);
      if (!consultation) {
        return callback?.({ error: "Consultation not found." });
      }

      // Authorization: only patient, doctor, or admin can join
      const isPatient = consultation.patient.toString() === userId;
      const isDoctor = consultation.doctor.toString() === userId;
      const isAdmin = socket.user.role === "admin";

      if (!isPatient && !isDoctor && !isAdmin) {
        return callback?.({ error: "You are not authorized to access this consultation." });
      }

      const roomName = `consultation:${consultationId}`;
      socket.join(roomName);
      console.log(`[Socket] ${socket.id} joined room ${roomName}`);

      // Send message history
      const messages = await Message.find({ consultation: consultationId })
        .sort({ createdAt: 1 })
        .limit(100)
        .populate("sender", "fullName role");

      callback?.({ success: true, messages });
    } catch (error) {
      console.error("[Socket] joinConsultation error:", error.message);
      callback?.({ error: "Server error while joining consultation." });
    }
  });

  // ── Leave a consultation room ──
  socket.on("leaveConsultation", (consultationId) => {
    const roomName = `consultation:${consultationId}`;
    socket.leave(roomName);
    console.log(`[Socket] ${socket.id} left room ${roomName}`);
  });

  // ── Send a message ──
  socket.on("sendMessage", async (data, callback) => {
    try {
      const { consultationId, content } = data || {};

      // Validate input
      if (!consultationId || !content) {
        return callback?.({ error: "consultationId and content are required." });
      }

      if (typeof content !== "string" || content.trim().length === 0) {
        return callback?.({ error: "Message content cannot be empty." });
      }

      if (content.length > 2000) {
        return callback?.({ error: "Message cannot exceed 2000 characters." });
      }

      if (!mongoose.isValidObjectId(consultationId)) {
        return callback?.({ error: "Invalid consultation ID." });
      }

      // Verify the sender is in this consultation
      const consultation = await Consultation.findById(consultationId);
      if (!consultation) {
        return callback?.({ error: "Consultation not found." });
      }

      const isPatient = consultation.patient.toString() === userId;
      const isDoctor = consultation.doctor.toString() === userId;

      if (!isPatient && !isDoctor) {
        return callback?.({ error: "You are not authorized to send messages in this consultation." });
      }

      // PERSIST FIRST, then deliver.
      // If the database write fails, we do NOT deliver — we want reliable records.
      const message = await Message.create({
        consultation: consultationId,
        sender: userId,
        content: content.trim()
      });

      const populated = await Message.findById(message._id)
        .populate("sender", "fullName role");

      const messageData = {
        _id: populated._id,
        consultation: consultationId,
        sender: {
          _id: populated.sender._id,
          fullName: populated.sender.fullName,
          role: populated.sender.role
        },
        content: populated.content,
        createdAt: populated.createdAt
      };

      // DELIVER to all sockets in the consultation room
      const roomName = `consultation:${consultationId}`;
      io.to(roomName).emit("newMessage", messageData);

      callback?.({ success: true, message: messageData });
    } catch (error) {
      console.error("[Socket] sendMessage error:", error.message);
      callback?.({ error: "Failed to send message. Database write failed." });
    }
  });
}
