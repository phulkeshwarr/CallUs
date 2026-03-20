import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  // activeChat: { _id, name, country, userId } or null
  const [activeChat, setActiveChat] = useState(null);
  // messages: Map<peerId, Array<{ id, from, text, timestamp, isSelf }>>
  const [messagesMap, setMessagesMap] = useState({});
  // typingUsers: Set of user IDs currently typing
  const [typingUsers, setTypingUsers] = useState(new Set());
  // unread: Map<peerId, count>
  const [unreadMap, setUnreadMap] = useState({});

  const typingTimeoutRef = useRef({});
  const activeChatRef = useRef(null);

  // Keep ref in sync with state
  activeChatRef.current = activeChat;

  const openChat = useCallback((peer) => {
    setActiveChat(peer);
    // Clear unread for this peer
    setUnreadMap((prev) => {
      const next = { ...prev };
      delete next[peer._id];
      return next;
    });
  }, []);

  const closeChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  const sendMessage = useCallback(
    (text) => {
      if (!socket || !activeChat || !text.trim()) return;
      socket.emit("chat:send", {
        to: activeChat._id,
        text: text.trim(),
      });
    },
    [socket, activeChat]
  );

  const sendTyping = useCallback(
    (isTyping) => {
      if (!socket || !activeChat) return;
      socket.emit("chat:typing", {
        to: activeChat._id,
        isTyping,
      });
    },
    [socket, activeChat]
  );

  // Listen for incoming messages
  const handleReceive = useCallback(
    (msg) => {
      const peerId = msg.isSelf ? activeChatRef.current?._id : msg.from._id;
      if (!peerId) return;

      const chatMsg = {
        id: msg.id,
        text: msg.text,
        timestamp: msg.timestamp,
        isSelf: !!msg.isSelf,
        senderName: msg.from?.name,
        senderUserId: msg.from?.userId,
      };

      setMessagesMap((prev) => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), chatMsg],
      }));

      // If the message is from someone else and they're not the active chat, increment unread
      if (!msg.isSelf && activeChatRef.current?._id !== peerId) {
        setUnreadMap((prev) => ({
          ...prev,
          [peerId]: (prev[peerId] || 0) + 1,
        }));
      }
    },
    []
  );

  // Listen for typing indicators
  const handleTyping = useCallback(({ from, isTyping }) => {
    setTypingUsers((prev) => {
      const next = new Set(prev);
      if (isTyping) {
        next.add(from);
        // Auto-clear after 3s
        if (typingTimeoutRef.current[from]) {
          clearTimeout(typingTimeoutRef.current[from]);
        }
        typingTimeoutRef.current[from] = setTimeout(() => {
          setTypingUsers((p) => {
            const n = new Set(p);
            n.delete(from);
            return n;
          });
        }, 3000);
      } else {
        next.delete(from);
      }
      return next;
    });
  }, []);

  // Socket event listeners
  useState(() => {
    // This runs once on mount
  });

  // Attach socket listeners
  const socketRef = useRef(null);
  if (socket && socket !== socketRef.current) {
    if (socketRef.current) {
      socketRef.current.off("chat:receive", handleReceive);
      socketRef.current.off("chat:typing", handleTyping);
    }
    socket.on("chat:receive", handleReceive);
    socket.on("chat:typing", handleTyping);
    socketRef.current = socket;
  }

  const getMessages = useCallback(
    (peerId) => messagesMap[peerId] || [],
    [messagesMap]
  );

  const getUnread = useCallback(
    (peerId) => unreadMap[peerId] || 0,
    [unreadMap]
  );

  const value = useMemo(
    () => ({
      activeChat,
      openChat,
      closeChat,
      sendMessage,
      sendTyping,
      getMessages,
      getUnread,
      typingUsers,
      messagesMap,
    }),
    [activeChat, openChat, closeChat, sendMessage, sendTyping, getMessages, getUnread, typingUsers, messagesMap]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
