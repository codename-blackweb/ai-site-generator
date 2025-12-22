import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePrescriptiveChat } from "@/components/chat/PrescriptiveChatProvider";

export function ChatInput() {
  const { connected, sendMessage, abortGeneration, openChat } = usePrescriptiveChat();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    if (!value.trim()) return;
    sendMessage(value);
    setValue("");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const metaKey = event.metaKey || event.ctrlKey;
      if (metaKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openChat();
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      if (event.key === "Escape") {
        abortGeneration();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abortGeneration, openChat]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border/70 px-4 py-3">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={connected ? "Ask Exhibit what to change..." : "Connecting..."}
        className="min-h-[64px] w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-inner shadow-black/20 outline-none transition focus:border-primary/60"
        disabled={!connected}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Enter to send / Shift+Enter for newline</span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!connected || !value.trim()}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-primary/40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
