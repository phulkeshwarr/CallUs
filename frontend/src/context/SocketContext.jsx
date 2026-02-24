import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsSocketConnected(false);
      setOnlineUserIds([]);
      setSocket((existing) => {
        existing?.disconnect();
        return null;
      });
      return;
    }

    const instance = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    instance.on("connect", () => {
      setIsSocketConnected(true);
    });

    instance.on("disconnect", () => {
      setIsSocketConnected(false);
      setOnlineUserIds([]);
    });

    instance.on("connect_error", () => {
      setIsSocketConnected(false);
      setOnlineUserIds([]);
    });

    instance.on("presence:bootstrap", ({ onlineUserIds: ids }) => {
      setOnlineUserIds(ids || []);
    });

    instance.on("presence:update", ({ onlineUserIds: ids }) => {
      setOnlineUserIds(ids || []);
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
      setIsSocketConnected(false);
      setOnlineUserIds([]);
    };
  }, [token]);

  const value = useMemo(
    () => ({ socket, onlineUserIds, isSocketConnected }),
    [socket, onlineUserIds, isSocketConnected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
