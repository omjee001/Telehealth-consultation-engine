/*
 * Phase 9 — Message Model
 *
 * DELIVERY vs PERSISTENCE:
 *   Delivery → the message reaches the recipient's screen in real-time via Socket.io
 *   Persistence → the message is saved to MongoDB for permanent storage
 *
 * These are DIFFERENT things:
 *   - A message can be delivered but NOT persisted (if the DB write fails)
 *   - A message can be persisted but NOT delivered (if the recipient is offline)
 *
 * Our implementation: persist FIRST, then deliver.
 * If the database write fails, we don't deliver — because we want a reliable record.
 * If the recipient is offline, the message is still saved and they'll see it when they reconnect.
 */

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: [true, "Consultation ID is required."],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required."]
    },
    content: {
      type: String,
      required: [true, "Message content is required."],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters."]
    }
  },
  { timestamps: true }
);

// Index for efficient message retrieval by consultation
messageSchema.index({ consultation: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
