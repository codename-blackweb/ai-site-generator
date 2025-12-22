import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ClipboardCopy } from "lucide-react";

const resolveSiteId = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("exhibit.siteId") || "";
};

type ReadinessResult = {
  status: "green" | "yellow" | "red";
  build: { ok: boolean };
  placeholders: { count: number; sections: string[] };
  missingMedia: { count: number; sections: string[] };
  notes: string[];
};

const netlifyCmd = `npm install\nnpm run build\nnpx netlify deploy --prod --dir=dist`;
const vercelCmd = `npm install\nnpm run build\nnpx vercel --prod`;

const statusIcon = (status: ReadinessResult["status"]) => {
  if (status === "green") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "yellow") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-rose-500" />;
};

export function DeployPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [netlifyConnected, setNetlifyConnected] = useState(false);
  const [netlifyChecking, setNetlifyChecking] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ deployUrl?: string | null; adminUrl?: string | null } | null>(
    null,
  );
  const [deployError, setDeployError] = useState<string | null>(null);

  const checkNetlifyConnection = async () => {
    const siteId = resolveSiteId();
    if (!siteId) return;
    setNetlifyChecking(true);
    try {
      const res = await fetch(`/api/deploy/netlify?siteId=${encodeURIComponent(siteId)}`);
      const data = (await res.json()) as { connected?: boolean };
      if (res.ok) {
        setNetlifyConnected(!!data.connected);
      }
    } catch {
      setNetlifyConnected(false);
    } finally {
      setNetlifyChecking(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkNetlifyConnection();
    }
  }, [open]);

  const runCheck = async () => {
    const siteId = resolveSiteId();
    if (!siteId) {
      setError("Site ID missing.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/deploy/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = (await res.json()) as ReadinessResult | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || "Readiness check failed");
        setResult(null);
        return;
      }
      setResult(data as ReadinessResult);
    } catch (err: any) {
      setError(err?.message || "Readiness check failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string) => {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(text);
  };

  const handleNetlifyConnect = () => {
    const siteId = resolveSiteId();
    if (!siteId || typeof window === "undefined") {
      setDeployError("Site ID missing.");
      return;
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const url = `/api/deploy/netlify/connect?siteId=${encodeURIComponent(siteId)}&returnTo=${encodeURIComponent(
      returnTo,
    )}`;
    window.location.assign(url);
  };

  const handleNetlifyDeploy = async () => {
    const siteId = resolveSiteId();
    if (!siteId) {
      setDeployError("Site ID missing.");
      return;
    }
    setDeployError(null);
    setDeployResult(null);
    setDeploying(true);
    try {
      const res = await fetch("/api/deploy/netlify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, exportId: siteId }),
      });
      const data = (await res.json()) as {
        status?: string;
        deployUrl?: string | null;
        adminUrl?: string | null;
        error?: string;
        message?: string;
        details?: string;
      };
      if (!res.ok || data.status === "error") {
        throw new Error(data.error || data.message || data.details || "Deploy failed");
      }
      setDeployResult({ deployUrl: data.deployUrl, adminUrl: data.adminUrl });
      setNetlifyConnected(true);
    } catch (err: any) {
      setDeployError(err?.message || "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="border-b border-border/70 px-4 py-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deploy
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-border/60 px-2 py-1 text-[11px]"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-border bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Netlify (One-click)
              </span>
              <span className="text-[11px] text-muted-foreground">
                {netlifyChecking ? "Checking..." : netlifyConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {netlifyConnected ? (
                <button
                  type="button"
                  className="flex-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold"
                  onClick={handleNetlifyDeploy}
                  disabled={deploying}
                >
                  {deploying ? "Deploying..." : "Deploy now"}
                </button>
              ) : (
                <button
                  type="button"
                  className="flex-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold"
                  onClick={handleNetlifyConnect}
                >
                  Connect Netlify
                </button>
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Exporting -> Uploading -> Publishing
            </div>
            {deployResult?.deployUrl ? (
              <div className="mt-2 space-y-1 text-[11px]">
                <div>
                  Live URL:{" "}
                  <a className="text-primary underline" href={deployResult.deployUrl} target="_blank" rel="noreferrer">
                    {deployResult.deployUrl}
                  </a>
                </div>
                {deployResult.adminUrl ? (
                  <div>
                    Admin:{" "}
                    <a className="text-primary underline" href={deployResult.adminUrl} target="_blank" rel="noreferrer">
                      Open in Netlify
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
            {deployError ? <div className="mt-2 text-[11px] text-destructive">{deployError}</div> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Netlify (CLI)</span>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
                onClick={() => copyText(netlifyCmd)}
              >
                <ClipboardCopy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-2 text-[11px]">
              {netlifyCmd}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Vercel (CLI)</span>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
                onClick={() => copyText(vercelCmd)}
              >
                <ClipboardCopy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-2 text-[11px]">
              {vercelCmd}
            </pre>
          </div>

          <div className="rounded-lg border border-border bg-background p-2">
            <button
              type="button"
              onClick={runCheck}
              className="w-full rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold"
              disabled={loading}
            >
              {loading ? "Checking…" : "Run deploy readiness check"}
            </button>
            {result ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-[11px]">
                  {statusIcon(result.status)}
                  <span className="font-semibold">Status:</span> {result.status}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Placeholders: {result.placeholders.count} · Missing media: {result.missingMedia.count}
                </div>
                {result.notes.length ? (
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                    {result.notes.map((note, idx) => (
                      <li key={`${note}-${idx}`}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {error ? <div className="mt-2 text-[11px] text-destructive">{error}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
