import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChatMessage, ChatMessageChunk, ChatSocket, PrescriptiveMeta } from "@/lib/chatTypes";
import { createMockChatSocket } from "@/lib/mockChatSocket";
import { createSocketClient } from "@/lib/socketClient";
import { createHttpChatAdapter } from "@/lib/httpChatAdapter";

type ChatContextValue = {
  connected: boolean;
  messages: ChatMessage[];
  prescriptiveMeta: PrescriptiveMeta | null;
  transport: "mock" | "http" | "ws";
  isOpen: boolean;
  isExpanded: boolean;
  sendMessage: (content: string) => void;
  abortGeneration: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleExpanded: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const createClientMessage = (content: string): ChatMessage => ({
  id: `user_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
  role: "user",
  type: "chatter",
  content,
  createdAt: Date.now(),
});

export function PrescriptiveChatProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<ChatSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prescriptiveMeta, setPrescriptiveMeta] = useState<PrescriptiveMeta | null>(null);
  const [transport, setTransport] = useState<"mock" | "http" | "ws">("mock");
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
    const httpUrlOverride = import.meta.env.VITE_CHAT_HTTP_URL as string | undefined;
    const httpUrl = httpUrlOverride || "/.netlify/functions/chat";
    const sessionId = (() => {
      if (typeof window === "undefined") return `session_${Date.now()}`;
      const existing = sessionStorage.getItem("exhibit.sessionId");
      if (existing) return existing;
      const created =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `session_${Date.now()}`;
      sessionStorage.setItem("exhibit.sessionId", created);
      return created;
    })();
    const siteId =
      typeof window === "undefined"
        ? "local-dev"
        : localStorage.getItem("exhibit.siteId") || "local-dev";
    const pageId = typeof window === "undefined" ? "home" : window.location.pathname || "home";

    const shouldUseMock = import.meta.env.DEV && !wsUrl && !httpUrlOverride;
    const nextTransport = wsUrl ? "ws" : shouldUseMock ? "mock" : "http";
    setTransport(nextTransport);
    const socket = wsUrl
      ? createSocketClient(wsUrl, { siteId, pageId, sessionId })
      : shouldUseMock
        ? createMockChatSocket()
        : createHttpChatAdapter(httpUrl, { siteId, pageId });
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleMessage = (payload: unknown) => {
      const message = payload as ChatMessage;
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          type: message.type ?? "chatter",
        },
      ]);
    };
    const handleChunk = (payload: unknown) => {
      const chunk = payload as ChatMessageChunk;
      setMessages((prev) => {
        const index = prev.findIndex((message) => message.id === chunk.messageId);
        if (index === -1) {
          return [
            ...prev,
            {
              id: chunk.messageId,
              role: chunk.role ?? "ai",
              type: chunk.type ?? "chatter",
              content: chunk.done ? chunk.delta : `${chunk.delta}|`,
              createdAt: Date.now(),
            },
          ];
        }
        const updated = [...prev];
        const base = updated[index].content.replace(/\|$/, "");
        updated[index] = {
          ...updated[index],
          content: chunk.done ? `${base}${chunk.delta}` : `${base}${chunk.delta}|`,
          type: chunk.type ?? updated[index].type,
        };
        return updated;
      });
    };
    const handleMeta = (payload: unknown) => {
      const meta = payload as PrescriptiveMeta;
      setPrescriptiveMeta(meta);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message", handleMessage);
    socket.on("message_chunk", handleChunk);
    socket.on("prescriptive_meta", handleMeta);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleMessage);
      socket.off("message_chunk", handleChunk);
      socket.off("prescriptive_meta", handleMeta);
      socket.disconnect();
    };
  }, []);

  const sendMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, createClientMessage(trimmed)]);
    socketRef.current?.emit("user_message", { role: "user", content: trimmed, timestamp: Date.now() });
  };

  const value = useMemo(
    () => ({
      connected,
      messages,
      prescriptiveMeta,
      transport,
      isOpen,
      isExpanded,
      sendMessage,
      abortGeneration: () => {
        socketRef.current?.abort?.();
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role !== "ai") return prev;
          const cleaned = last.content.replace(/\|$/, "");
          const updated = [...prev];
          updated[prev.length - 1] = { ...last, content: cleaned };
          return updated;
        });
      },
      openChat: () => setIsOpen(true),
      closeChat: () => setIsOpen(false),
      toggleExpanded: () => setIsExpanded((prev) => !prev),
    }),
    [connected, messages, prescriptiveMeta, transport, isOpen, isExpanded],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function usePrescriptiveChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("usePrescriptiveChat must be used within PrescriptiveChatProvider");
  }
  return context;
}
