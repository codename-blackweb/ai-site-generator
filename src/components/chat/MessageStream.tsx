import { useEffect, useRef, useState } from "react";
import { usePrescriptiveChat } from "@/components/chat/PrescriptiveChatProvider";
import { MessageBubble } from "@/components/chat/MessageBubble";

export function MessageStream() {
  const { messages } = usePrescriptiveChat();
  const endRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (shouldAutoScroll) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const threshold = 120;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setShouldAutoScroll(atBottom);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
