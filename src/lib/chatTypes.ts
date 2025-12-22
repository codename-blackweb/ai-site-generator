export type ChatRole = "user" | "ai" | "system" | "prescription";

export type MessageType =
  | "chatter"
  | "insight"
  | "recommendation"
  | "warning"
  | "blocker"
  | "question"
  | "action";

export type PrescriptiveIntent =
  | "diagnostic"
  | "corrective"
  | "optimizing"
  | "strategic"
  | "blocking"
  | "confirming";

export type PrescriptiveMeta = {
  intent?: PrescriptiveIntent;
  confidence?: number;
  blocking?: boolean;
  relatedContext?: string[];
  expiresAt?: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  type: MessageType;
  content: string;
  title?: string;
  severity?: "low" | "medium" | "high";
  confidence?: number;
  actionId?: string;
  meta?: {
    insight?: boolean;
    recommendation?: boolean;
    warning?: boolean;
    nextAction?: string;
  };
  createdAt: number;
};

export type PrescriptiveMessage = {
  id: string;
  type: MessageType;
  title?: string;
  content: string;
  severity?: "low" | "medium" | "high";
  confidence?: number;
  actionId?: string;
};

export type ChatMessageChunk = {
  messageId: string;
  delta: string;
  role?: ChatRole;
  type?: MessageType;
  done?: boolean;
};

export type ChatSocketEvent = "connect" | "disconnect" | "message" | "message_chunk" | "prescriptive_meta";

export type ChatSocket = {
  readonly connected: boolean;
  connect: () => void;
  disconnect: () => void;
  on: (event: ChatSocketEvent, handler: (payload: unknown) => void) => void;
  off: (event: ChatSocketEvent, handler: (payload: unknown) => void) => void;
  emit: (event: string, payload: unknown) => void;
  abort?: () => void;
};
