import { useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { renderSectionPreview } from "@/components/chat/sectionPreviewRenderers";
import { buildAuthHeaders } from "@/lib/authSession";

type InlineSectionChatProps = {
  siteId?: string;
  conversationId?: string;
  pageId: string;
  sectionId: string;
  sectionInstanceId: string;
  onClose: () => void;
  onApplied?: (updated: {
    sectionInstanceId: string;
    pageId: string;
    sectionId: string;
    content: unknown;
  }) => void;
};

const setValueAtPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const segments = path.split(".");
  let cursor: Record<string, unknown> | Array<unknown> = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const match = segment.match(/^(.+)\[(\d+)\]$/);
    const isLast = index === segments.length - 1;

    if (match) {
      const key = match[1];
      const position = Number(match[2]);
      if (!Array.isArray((cursor as Record<string, unknown>)[key])) {
        (cursor as Record<string, unknown>)[key] = [];
      }
      const arrayRef = (cursor as Record<string, unknown>)[key] as Array<unknown>;
      if (isLast) {
        arrayRef[position] = value;
        return;
      }
      if (!arrayRef[position] || typeof arrayRef[position] !== "object") {
        arrayRef[position] = {};
      }
      cursor = arrayRef[position] as Record<string, unknown>;
    } else {
      if (isLast) {
        (cursor as Record<string, unknown>)[segment] = value;
        return;
      }
      if (
        !(cursor as Record<string, unknown>)[segment] ||
        typeof (cursor as Record<string, unknown>)[segment] !== "object"
      ) {
        (cursor as Record<string, unknown>)[segment] = {};
      }
      cursor = (cursor as Record<string, unknown>)[segment] as Record<string, unknown>;
    }
  }
};

export function InlineSectionChat({
  siteId,
  conversationId,
  pageId,
  sectionId,
  sectionInstanceId,
  onClose,
  onApplied,
}: InlineSectionChatProps) {
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState("");
  const [draftJson, setDraftJson] = useState<unknown | null>(null);
  const draftRef = useRef<Record<string, unknown> | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const apiUrl = useMemo(() => {
    const override = import.meta.env.VITE_CHAT_HTTP_URL as string | undefined;
    return override || "/.netlify/functions/chat";
  }, []);
  const undoUrl = useMemo(() => {
    if (apiUrl.endsWith("/chat")) {
      return apiUrl.replace(/\/chat$/, "/section_undo");
    }
    return "/.netlify/functions/section_undo";
  }, [apiUrl]);

  const resolvedSiteId =
    siteId || (typeof window !== "undefined" ? localStorage.getItem("exhibit.siteId") || "" : "");
  const resolvedConversationId =
    conversationId ||
    (typeof window !== "undefined" ? localStorage.getItem("exhibit.conversationId") || "" : "");

  const generate = async () => {
    if (!input.trim() || streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setDraft("");
    setDraftJson(null);
    draftRef.current = null;
    setStreaming(true);
    setError(null);

    try {
      const auth = await buildAuthHeaders({ "content-type": "application/json" });
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: auth.headers,
        signal: controller.signal,
        body: JSON.stringify({
          siteId: resolvedSiteId || undefined,
          conversationId: resolvedConversationId || undefined,
          scope: {
            type: "section",
            pageId,
            sectionId,
            sectionInstanceId,
          },
          stream: true,
          message: input,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Inline edit failed.");
      }

      const headerConversationId = res.headers.get("x-conversation-id");
      const headerSiteId = res.headers.get("x-site-id");
      if (typeof window !== "undefined") {
        if (headerConversationId) {
          localStorage.setItem("exhibit.conversationId", headerConversationId);
        }
        if (headerSiteId) {
          localStorage.setItem("exhibit.siteId", headerSiteId);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No stream returned.");
      }

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setDraft(text);
        const lines = text.split("\n").filter(Boolean);
        let nextDraft = { ...(draftRef.current ?? {}) };
        let updated = false;
        for (const line of lines) {
          try {
            const payload = JSON.parse(line) as { path?: string; value?: unknown };
            if (!payload.path) continue;
            if (payload.path === "__final__") {
              nextDraft = payload.value && typeof payload.value === "object" ? payload.value : nextDraft;
              updated = true;
              continue;
            }
            if (!nextDraft || typeof nextDraft !== "object") {
              nextDraft = {};
            }
            setValueAtPath(nextDraft as Record<string, unknown>, payload.path, payload.value);
            updated = true;
          } catch {
            continue;
          }
        }
        if (updated) {
          const updatedDraft = { ...(nextDraft as Record<string, unknown>) };
          draftRef.current = updatedDraft;
          setDraftJson(updatedDraft);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inline edit failed.";
      setError(message);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setStreaming(false);
    }
  };

  const apply = async () => {
    if (loading || !draftJson) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId: resolvedSiteId || undefined,
          conversationId: resolvedConversationId || undefined,
          scope: {
            type: "section",
            pageId,
            sectionId,
            sectionInstanceId,
          },
          message: "APPLY_DRAFT",
          draftText: JSON.stringify(draftJson),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Apply failed.");
      }

      if (typeof window !== "undefined") {
        if (data.conversationId) {
          localStorage.setItem("exhibit.conversationId", data.conversationId);
        }
        if (data.siteId) {
          localStorage.setItem("exhibit.siteId", data.siteId);
        }
      }

      if (data.updatedSection) {
        onApplied?.(data.updatedSection);
      }

      toast({
        title: "Section updated",
        description: "Changes applied to this section.",
        action: (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              try {
                const auth = await buildAuthHeaders({ "content-type": "application/json" });
                if (!auth.token) {
                  throw new Error("Sign in required.");
                }
                const undoRes = await fetch(undoUrl, {
                  method: "POST",
                  headers: auth.headers,
                  body: JSON.stringify({
                    siteId: resolvedSiteId || undefined,
                    conversationId: resolvedConversationId || undefined,
                    sectionInstanceId,
                  }),
                });
                const undoData = await undoRes.json();
                if (!undoRes.ok) {
                  throw new Error(undoData?.error || "Undo failed.");
                }
                if (undoData.updatedSection) {
                  onApplied?.(undoData.updatedSection);
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : "Undo failed.";
                toast({ title: "Undo failed", description: message, variant: "destructive" });
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apply failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const abort = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="absolute right-2 top-10 z-50 w-96 rounded-xl border border-border bg-card shadow-xl">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Edit section with AI
      </div>
      <textarea
        className="min-h-[96px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
        placeholder="Rewrite this section to sound more confident..."
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            generate();
          }
          if (event.key === "Escape") {
            abort();
          }
        }}
      />
      <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-muted-foreground">
        <span>Enter to generate / Shift+Enter for newline</span>
        {streaming ? (
          <button type="button" onClick={abort} className="text-[11px] text-foreground">
            Stop generating
          </button>
        ) : null}
      </div>
      <div className="mx-3 mb-2 min-h-[120px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
      {draftJson ? (
        <div className="space-y-2">
          {renderSectionPreview(sectionId, draftJson)}
          {streaming ? <span className="animate-pulse">|</span> : null}
        </div>
      ) : (
        <div className="text-muted-foreground">
          {draft ? "Draft is still forming..." : "Draft will appear here..."}
          {streaming ? <span className="animate-pulse">|</span> : null}
        </div>
      )}
      </div>
      {error ? <div className="px-3 pb-2 text-xs text-destructive">{error}</div> : null}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
        <button type="button" onClick={onClose} className="text-muted-foreground">
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generate}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground"
            disabled={streaming}
          >
            {streaming ? "Generating..." : "Generate"}
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            disabled={loading || streaming || !draftJson}
          >
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
