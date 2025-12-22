import { useState, type ReactNode } from "react";
import { InlineSectionChat } from "@/components/chat/InlineSectionChat";
import { InlineMediaReplace } from "@/components/chat/InlineMediaReplace";

type EditableSectionProps = {
  siteId?: string;
  conversationId?: string;
  pageId: string;
  sectionId: string;
  sectionInstanceId: string;
  children: ReactNode;
  onApplied?: (updated: {
    sectionInstanceId: string;
    pageId: string;
    sectionId: string;
    content: unknown;
  }) => void;
};

export function EditableSection({
  siteId,
  conversationId,
  pageId,
  sectionId,
  sectionInstanceId,
  children,
  onApplied,
}: EditableSectionProps) {
  const [open, setOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const isHero = sectionId.startsWith("hero");

  const handleApplied = (updated: {
    sectionInstanceId: string;
    pageId: string;
    sectionId: string;
    content: unknown;
  }) => {
    setOpen(false);
    setHighlight(true);
    onApplied?.(updated);
    setTimeout(() => setHighlight(false), 1200);
  };

  return (
    <div className={`relative group ${highlight ? "ring-2 ring-primary/60" : ""}`}>
      <div className="absolute right-3 top-3 z-40 flex gap-2 opacity-0 transition group-hover:opacity-100">
        {isHero ? (
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            className="rounded-full border border-border bg-background/90 px-2 py-1 text-xs font-semibold text-foreground shadow-sm"
          >
            Replace media
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-border bg-background/90 px-2 py-1 text-xs font-semibold text-foreground shadow-sm"
        >
          Edit with AI
        </button>
      </div>
      {open ? (
        <InlineSectionChat
          siteId={siteId}
          conversationId={conversationId}
          pageId={pageId}
          sectionId={sectionId}
          sectionInstanceId={sectionInstanceId}
          onClose={() => setOpen(false)}
          onApplied={handleApplied}
        />
      ) : null}
      {mediaOpen ? (
        <InlineMediaReplace
          siteId={siteId}
          sectionInstanceId={sectionInstanceId}
          conversationId={conversationId}
          onClose={() => setMediaOpen(false)}
          onApplied={handleApplied}
        />
      ) : null}
      {children}
    </div>
  );
}
