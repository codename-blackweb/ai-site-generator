import { usePrescriptiveChat } from "@/components/chat/PrescriptiveChatProvider";
import { MessageStream } from "@/components/chat/MessageStream";
import { ChatInput } from "@/components/chat/ChatInput";
import { DeployPanel } from "@/components/chat/DeployPanel";

export function ChatWindow() {
  const { isOpen, isExpanded, toggleExpanded, connected, closeChat } = usePrescriptiveChat();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-20 right-6 z-50 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl shadow-black/40 ${
        isExpanded ? "h-[80vh] w-[480px]" : ""
      }`}
      style={{ resize: "both" }}
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
          <div className="text-sm font-semibold">Exhibit Assistant</div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={toggleExpanded}
            className="rounded-full border border-border/60 px-2 py-1 transition hover:border-border"
          >
            {isExpanded ? "Compact" : "Expand"}
          </button>
          <button
            type="button"
            onClick={closeChat}
            className="rounded-full border border-border/60 px-2 py-1 transition hover:border-border"
          >
            Close
          </button>
        </div>
      </div>
      <DeployPanel />
      <MessageStream />
      <ChatInput />
    </div>
  );
}
