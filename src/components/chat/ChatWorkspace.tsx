import { useEffect, useRef, useState } from "react";
import { getAuthHeader } from "@/lib/authSession";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(36).slice(2, 10)}`;
};

export function ChatWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(
    typeof window === "undefined" ? null : localStorage.getItem("exhibit.conversationId"),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const assistantId = createId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationIdRef.current || undefined,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: "Error: chat request failed." } : msg,
          ),
        );
        setIsStreaming(false);
        return;
      }

      const headerConversationId = res.headers.get("x-conversation-id");
      if (headerConversationId) {
        conversationIdRef.current = headerConversationId;
        if (typeof window !== "undefined") {
          localStorage.setItem("exhibit.conversationId", headerConversationId);
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value || new Uint8Array());
        if (!chunk) continue;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: "Error: chat request failed." } : msg,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`whitespace-pre-wrap rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-neutral-800 text-neutral-100"
                  : "bg-neutral-900 text-neutral-200"
              }`}
            >
              {message.content || (message.role === "assistant" ? "..." : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-neutral-800 px-4 py-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message the assistant..."
            className="flex-1 resize-none rounded-md bg-neutral-900 p-3 text-neutral-100 outline-none"
            rows={1}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={isStreaming}
            className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-neutral-100 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
