import type { ChatMessage } from "@/lib/chatTypes";

const typeStyles: Record<ChatMessage["type"], string> = {
  chatter: "bg-secondary text-secondary-foreground",
  insight: "border border-sky-500/40 bg-sky-500/10 text-sky-100",
  recommendation: "border border-amber-400/50 bg-amber-500/10 text-amber-100",
  warning: "border border-rose-500/50 bg-rose-500/10 text-rose-100",
  blocker: "border border-red-500/60 bg-red-500/20 text-red-100",
  question: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  action: "border border-violet-400/50 bg-violet-500/10 text-violet-100",
};

const roleAlignment: Record<ChatMessage["role"], string> = {
  user: "ml-auto bg-primary text-primary-foreground",
  ai: "mr-auto",
  system: "mx-auto",
  prescription: "mr-auto",
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const alignment = roleAlignment[message.role];
  const typeStyle = message.role === "user" ? "" : typeStyles[message.type];

  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${alignment} ${typeStyle}`}>
      {message.title ? <div className="mb-1 text-xs font-semibold uppercase tracking-wide">{message.title}</div> : null}
      {message.severity ? (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {message.severity} severity
        </div>
      ) : null}
      <div>{message.content}</div>
      {message.type === "recommendation" ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <button className="rounded-full bg-amber-400/20 px-3 py-1 font-semibold text-amber-100 transition hover:bg-amber-400/30">
            Apply
          </button>
          <button className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-100 transition hover:border-amber-300">
            Review
          </button>
          <button className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-100 transition hover:border-amber-300">
            Ignore
          </button>
        </div>
      ) : null}
    </div>
  );
}
