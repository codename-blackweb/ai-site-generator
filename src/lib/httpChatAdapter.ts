import type {
  ChatMessage,
  ChatMessageChunk,
  ChatRole,
  ChatSocket,
  ChatSocketEvent,
  MessageType,
  PrescriptiveMeta,
  PrescriptiveIntent,
} from "@/lib/chatTypes";
import { buildAuthHeaders } from "@/lib/authSession";

type Handler = (payload: unknown) => void;

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(36).slice(2, 10)}`;
};

type ChatApiResponse = {
  conversationId?: string;
  siteId?: string;
  mode?: string;
  messages?: ChatMessage[];
  assistantMessage?: {
    id?: string;
    role?: ChatRole;
    content?: string;
  };
  prescriptive?: {
    summary?: string;
    intent?: PrescriptiveIntent;
    confidence?: number;
    blocking?: boolean;
    meta?: {
      relatedContext?: string[];
      expiresAt?: number;
    };
  };
};

export function createHttpChatAdapter(baseUrl: string, context: { siteId: string; pageId: string }): ChatSocket {
  let connected = false;
  const prescriptiveEnabled = import.meta.env.VITE_PRESCRIPTIVE_HTTP === "true";
  let abortController: AbortController | null = null;
  let conversationId: string | null =
    typeof window === "undefined" ? null : localStorage.getItem("exhibit.conversationId");
  let siteId: string | null = context.siteId || (typeof window === "undefined" ? null : localStorage.getItem("exhibit.siteId"));
  const listeners = new Map<ChatSocketEvent, Set<Handler>>();

  const emitEvent = (event: ChatSocketEvent, payload: unknown) => {
    const handlers = listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  };

  const connect = () => {
    connected = true;
    emitEvent("connect", {});
  };

  const disconnect = () => {
    connected = false;
    emitEvent("disconnect", {});
  };

  const on = (event: ChatSocketEvent, handler: Handler) => {
    const current = listeners.get(event) ?? new Set();
    current.add(handler);
    listeners.set(event, current);
  };

  const off = (event: ChatSocketEvent, handler: Handler) => {
    const current = listeners.get(event);
    if (!current) return;
    current.delete(handler);
  };

  const emit = async (event: string, payload: unknown) => {
    if (event !== "user_message") return;
    const content = (payload as { content?: string })?.content ?? "";
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    const shouldStream = !prescriptiveEnabled;
    const body: Record<string, string | boolean> = {
      message: content,
      pageId: context.pageId,
      stream: shouldStream,
    };
    if (conversationId) body.conversationId = conversationId;
    if (siteId) body.siteId = siteId;
    if (prescriptiveEnabled) body.prescriptive = true;

    try {
      const auth = await buildAuthHeaders({ "content-type": "application/json" });
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Chat API error: ${response.status} ${text}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/plain")) {
        const headerConversationId = response.headers.get("x-conversation-id");
        const headerSiteId = response.headers.get("x-site-id");
        if (headerConversationId) {
          conversationId = headerConversationId;
          if (typeof window !== "undefined") {
            localStorage.setItem("exhibit.conversationId", headerConversationId);
          }
        }
        if (headerSiteId) {
          siteId = headerSiteId;
          if (typeof window !== "undefined") {
            localStorage.setItem("exhibit.siteId", headerSiteId);
          }
        }

        const messageId = createId();
        const role: ChatRole = "ai";
        const type: MessageType = "chatter";
        emitEvent("message", {
          id: messageId,
          role,
          type,
          content: "",
          createdAt: Date.now(),
        });

        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            emitEvent("message_chunk", { messageId, delta: "", role, type, done: true });
            break;
          }
          const delta = decoder.decode(value, { stream: true });
          emitEvent("message_chunk", { messageId, delta, role, type, done: false });
        }

        return;
      }

      const data = (await response.json()) as ChatApiResponse;
      if (data.conversationId) {
        conversationId = data.conversationId;
        if (typeof window !== "undefined") {
          localStorage.setItem("exhibit.conversationId", data.conversationId);
        }
      }
      if (data.siteId) {
        siteId = data.siteId;
        if (typeof window !== "undefined") {
          localStorage.setItem("exhibit.siteId", data.siteId);
        }
      }

      if (data.prescriptive) {
        const prescriptiveMeta: PrescriptiveMeta = {
          intent: data.prescriptive.intent,
          confidence: data.prescriptive.confidence,
          blocking: data.prescriptive.blocking,
          relatedContext: data.prescriptive.meta?.relatedContext,
          expiresAt: data.prescriptive.meta?.expiresAt,
        };
        emitEvent("prescriptive_meta", prescriptiveMeta);
      }

      if (data.messages?.length) {
        data.messages.forEach((message, index) => {
          const messageId = message.id || createId();
          const role = message.role ?? "ai";
          const type = message.type ?? "chatter";
          const content = message.content ?? "";
          const createdAt = message.createdAt ?? Date.now();

          const baseMessage: ChatMessage = {
            ...message,
            id: messageId,
            role,
            type,
            content: "",
            createdAt,
          };

          setTimeout(() => {
            emitEvent("message", baseMessage);
            const chunks = content.split(" ");
            chunks.forEach((chunk, chunkIndex) => {
              const payloadChunk: ChatMessageChunk = {
                messageId,
                delta: `${chunk}${chunkIndex === chunks.length - 1 ? "" : " "}`,
                role,
                type,
                done: chunkIndex === chunks.length - 1,
              };
              const delay = 60 + chunkIndex * 40;
              setTimeout(() => emitEvent("message_chunk", payloadChunk), delay);
            });
          }, index * 140);
        });
        return;
      }

      const assistantText = data.assistantMessage?.content ?? data.prescriptive?.summary ?? "";
      if (!assistantText) return;

      const messageId = data.assistantMessage?.id ?? createId();
      const modeType: MessageType = data.mode === "clarifier" ? "question" : "chatter";
      const role: ChatRole = data.assistantMessage?.role ?? "ai";

      const baseMessage: ChatMessage = {
        id: messageId,
        role,
        type: modeType,
        content: "",
        createdAt: Date.now(),
      };

      emitEvent("message", baseMessage);

      const chunks = assistantText.split(" ");
      chunks.forEach((chunk, index) => {
        const payloadChunk: ChatMessageChunk = {
          messageId,
          delta: `${chunk}${index === chunks.length - 1 ? "" : " "}`,
          role,
          type: modeType,
          done: index === chunks.length - 1,
        };
        const delay = 60 + index * 40;
        setTimeout(() => emitEvent("message_chunk", payloadChunk), delay);
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message = error instanceof Error ? error.message : "Chat API failed.";
      emitEvent("message", {
        id: createId(),
        role: "ai",
        type: "warning",
        content: message,
        createdAt: Date.now(),
      });
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
    }
  };

  return {
    get connected() {
      return connected;
    },
    connect,
    disconnect,
    on,
    off,
    emit,
    abort() {
      abortController?.abort();
      abortController = null;
    },
  };
}
