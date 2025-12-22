import { useMemo, useState } from "react";
import { usePrescriptiveChat } from "@/components/chat/PrescriptiveChatProvider";

const typeOrder = ["insight", "recommendation", "warning", "question", "action", "blocker", "chatter"] as const;

export function PrescriptiveDebugPanel() {
  const { prescriptiveMeta, messages, transport } = usePrescriptiveChat();
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  const counts = useMemo(() => {
    return messages.reduce<Record<string, number>>((acc, message) => {
      acc[message.type] = (acc[message.type] || 0) + 1;
      return acc;
    }, {});
  }, [messages]);

  const findings = useMemo(
    () => messages.filter((message) => message.type === "insight").map((message) => message.content),
    [messages],
  );

  const missing = useMemo(
    () => messages.filter((message) => message.type === "question").map((message) => message.content),
    [messages],
  );

  return (
    <div className="fixed bottom-6 left-6 z-50 w-72">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-2 w-full rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-md"
      >
        {isOpen ? "Hide Prescriptive Debug" : "Show Prescriptive Debug"}
      </button>
      {isOpen ? (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-card-foreground shadow-xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Prescriptive Inspector
          </div>
          <div className="space-y-1">
            <div>
              <span className="font-semibold">Transport:</span> {transport}
            </div>
            <div>
              <span className="font-semibold">Intent:</span> {prescriptiveMeta?.intent ?? "—"}
            </div>
            <div>
              <span className="font-semibold">Confidence:</span>{" "}
              {prescriptiveMeta?.confidence !== undefined ? prescriptiveMeta.confidence.toFixed(2) : "—"}
            </div>
            <div>
              <span className="font-semibold">Blocking:</span>{" "}
              {prescriptiveMeta?.blocking !== undefined ? String(prescriptiveMeta.blocking) : "—"}
            </div>
            <div>
              <span className="font-semibold">Context:</span>{" "}
              {prescriptiveMeta?.relatedContext?.length ? prescriptiveMeta.relatedContext.join(", ") : "—"}
            </div>
            <div>
              <span className="font-semibold">Expires:</span>{" "}
              {prescriptiveMeta?.expiresAt ? new Date(prescriptiveMeta.expiresAt).toLocaleTimeString() : "—"}
            </div>
            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Message Counts
            </div>
            <div className="grid grid-cols-2 gap-1">
              {typeOrder.map((type) => (
                <div key={type}>
                  <span className="font-semibold">{type}:</span> {counts[type] ?? 0}
                </div>
              ))}
            </div>
            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Why This Advice
            </div>
            {findings.length ? (
              <ul className="list-disc space-y-1 pl-4">
                {findings.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <div>—</div>
            )}
            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              What's Missing
            </div>
            {missing.length ? (
              <ul className="list-disc space-y-1 pl-4">
                {missing.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <div>—</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
