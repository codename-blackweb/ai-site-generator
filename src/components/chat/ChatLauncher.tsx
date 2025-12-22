import { usePrescriptiveChat } from "@/components/chat/PrescriptiveChatProvider";
import { ChatWindow } from "@/components/chat/ChatWindow";

export function ChatLauncher() {
  const { isOpen, openChat, closeChat } = usePrescriptiveChat();

  return (
    <>
      <button
        type="button"
        onClick={isOpen ? closeChat : openChat}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground shadow-lg shadow-black/30 transition hover:bg-secondary/80"
      >
        {isOpen ? "Close Exhibit" : "Chat with Exhibit"}
      </button>
      <ChatWindow />
    </>
  );
}
