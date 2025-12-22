import type { ChatMessage, ChatMessageChunk, ChatRole, ChatSocket, ChatSocketEvent, PrescriptiveMeta } from "@/lib/chatTypes";

type Handler = (payload: unknown) => void;

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(36).slice(2, 10)}`;
};

const buildStubResponse = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "Tell me what you want to change and I will respond in steps.";
  if (/why|reason|explain/i.test(trimmed)) {
    return "I prioritized credibility before conversion so hiring managers see proof before being asked to act.";
  }
  if (/change|adjust|remove|move/i.test(trimmed)) {
    return "I can make that structural change. Say exactly which page and section to modify.";
  }
  return "I can explain the current structure, adjust sections, or draft copy for a specific section.";
};

export function createMockChatSocket(): ChatSocket {
  let connected = false;
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

  const emit = (event: string, payload: unknown) => {
    if (event !== "user_message") return;
    const content = (payload as { content?: string })?.content ?? "";
    const messageType =
      /why|reason|explain/i.test(content)
        ? "insight"
        : /change|adjust|remove|move/i.test(content)
          ? "recommendation"
          : "chatter";
    const messageId = createId();
    const responseText = buildStubResponse(content);
    const response: ChatMessage = {
      id: messageId,
      role: "ai",
      type: messageType,
      content: "",
      createdAt: Date.now(),
      meta: {
        insight: messageType === "insight",
        recommendation: messageType === "recommendation",
      },
    };

    emitEvent("message", response);
    const meta: PrescriptiveMeta = {
      intent: messageType === "insight" ? "diagnostic" : messageType === "recommendation" ? "corrective" : "optimizing",
      confidence: messageType === "recommendation" ? 0.78 : 0.62,
      blocking: false,
      relatedContext: [
        "site:mock-site",
        "page:home",
        "goal:credibility",
        "purpose:mock-purpose",
        "audience:mock-audience",
        "action:mock-action",
        "tone:mock-tone",
      ],
    };
    emitEvent("prescriptive_meta", meta);

    const chunks = responseText.split(" ");
    chunks.forEach((chunk, index) => {
      const payloadChunk: ChatMessageChunk = {
        messageId,
        delta: `${chunk}${index === chunks.length - 1 ? "" : " "}`,
        role: "ai" satisfies ChatRole,
        type: messageType,
        done: index === chunks.length - 1,
      };
      const delay = 120 + index * 60;
      setTimeout(() => emitEvent("message_chunk", payloadChunk), delay);
    });
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
      // mock: no active request to cancel
    },
  };
}
