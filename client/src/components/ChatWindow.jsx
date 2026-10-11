import React, { useState, useEffect, useRef } from "react";
import { getSocket } from "../services/socket.js";

/*
 * Phase 8-10 — Chat Window Component
 *
 * WHAT IS REAL-TIME COMMUNICATION?
 * Traditional web apps use HTTP (like fetch or axios), where the client always asks
 * the server for data. With HTTP, the server cannot independently send data to the client.
 *
 * Socket.io provides a continuous, bidirectional connection. The server can push
 * events directly to the client at any time.
 *
 * ROOMS:
 * We use Socket.io "rooms" to isolate communication. When a user opens a consultation chat,
 * they "join" a room specific to that consultation. When they send a message, the server
 * only broadcasts it to other users in that specific room.
 */
function ChatWindow({ consultationId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [error, setError] = useState("");
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to the bottom of the messages list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join the consultation room and load history
    socket.emit("joinConsultation", consultationId, (response) => {
      if (response.error) {
        setError(response.error);
      } else {
        setMessages(response.messages || []);
      }
    });

    // Listen for new incoming messages
    const handleNewMessage = (message) => {
      setMessages((prev) => {
        // Prevent duplicate messages if the sender also receives it
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userId }) => {
      if (userId !== currentUserId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
      }
    };

    const handleUserStoppedTyping = ({ userId }) => {
      if (userId !== currentUserId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    // Cleanup when the component unmounts (closing the chat)
    return () => {
      socket.emit("leaveConsultation", consultationId);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [consultationId, currentUserId]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    const socket = getSocket();
    if (!socket) return;

    socket.emit("typing", { consultationId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { consultationId });
    }, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const socket = getSocket();
    if (!socket) return;

    // Stop typing immediately before sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("stopTyping", { consultationId });

    socket.emit("sendMessage", { consultationId, content: newMessage }, (response) => {
      if (response.error) {
        setError(response.error);
        alert(response.error); // Fallback alert for send errors
      } else {
        // Some backends don't emit to sender, so we add it manually
        setMessages((prev) => {
          if (prev.some(m => m._id === response.message._id)) return prev;
          return [...prev, response.message];
        });
        setNewMessage("");
      }
    });
  };

  return (
    <div className="chat-container">
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const isSent = msg.sender._id === currentUserId;
          return (
            <div key={msg._id || index} className={`chat-message ${isSent ? "sent" : "received"}`}>
              <div className="chat-meta">
                {isSent ? "You" : msg.sender.fullName || "User"} • {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
              <p>{msg.content}</p>
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;
