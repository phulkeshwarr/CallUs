import { useEffect, useRef, useState } from "react";
import { useChat } from "../context/ChatContext";

export function ChatPanel() {
  const {
    activeChat,
    closeChat,
    sendMessage,
    sendTyping,
    getMessages,
    typingUsers,
  } = useChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const messages = activeChat ? getMessages(activeChat._id) : [];
  const isTyping = activeChat && typingUsers.has(activeChat._id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  // Reset input when chat changes
  useEffect(() => {
    setInput("");
  }, [activeChat?._id]);

  function handleSend(e) {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
    sendTyping(false);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    sendTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (!activeChat) return null;

  return (
    <aside className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="flag">{activeChat.flag || "🌍"}</span>
          <div>
            <h4>{activeChat.name}</h4>
            <span className="chat-uid">#{activeChat.userId}</span>
          </div>
        </div>
        <button className="btn btn-sm" onClick={closeChat} type="button" title="Close chat">
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <p>No messages yet.<br />Say hello anonymously!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.isSelf ? "sent" : "received"}`}
          >
            {msg.text}
            <span className="bubble-time">{formatTime(msg.timestamp)}</span>
          </div>
        ))}
        {isTyping && (
          <div className="typing-indicator">typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={!input.trim()}>
          ➤
        </button>
      </form>
    </aside>
  );
}
