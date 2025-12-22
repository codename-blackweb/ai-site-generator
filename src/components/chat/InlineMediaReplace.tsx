import { useRef, useState } from "react";
import { UploadCloud, Sparkles } from "lucide-react";
import { buildAuthHeaders } from "@/lib/authSession";

const resolveSiteId = (siteId?: string) => {
  if (siteId) return siteId;
  if (typeof window === "undefined") return "";
  return localStorage.getItem("exhibit.siteId") || "";
};

type InlineMediaReplaceProps = {
  siteId?: string;
  sectionInstanceId: string;
  conversationId?: string;
  onClose: () => void;
  onApplied?: (updated: {
    sectionInstanceId: string;
    pageId: string;
    sectionId: string;
    content: unknown;
  }) => void;
};

export function InlineMediaReplace({
  siteId,
  sectionInstanceId,
  conversationId,
  onClose,
  onApplied,
}: InlineMediaReplaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachAsset = async (resolvedSiteId: string, assetId: string, authHeaders: Record<string, string>) => {
    const attachResp = await fetch("/api/media/attach", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        siteId: resolvedSiteId,
        sectionId: sectionInstanceId,
        mediaAssetId: assetId,
        conversationId,
      }),
    });

    if (!attachResp.ok) {
      const data = await attachResp.json().catch(() => ({}));
      throw new Error(data.error || "Attach failed");
    }

    const attachData = (await attachResp.json()) as {
      updatedSection: {
        sectionInstanceId: string;
        pageId: string;
        sectionId: string;
        content: unknown;
      };
    };

    onApplied?.(attachData.updatedSection);
    onClose();
  };

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const resolvedSiteId = resolveSiteId(siteId);
      if (!resolvedSiteId) {
        throw new Error("Site ID missing");
      }

      const auth = await buildAuthHeaders();
      if (!auth.token) {
        throw new Error("Sign in required");
      }
      const jsonHeaders = { ...auth.headers, "content-type": "application/json" };

      const uploadResp = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          siteId: resolvedSiteId,
          mime: file.type,
          role: "hero",
        }),
      });

      if (!uploadResp.ok) {
        const data = await uploadResp.json().catch(() => ({}));
        throw new Error(data.error || "Upload URL failed");
      }

      const uploadData = (await uploadResp.json()) as {
        uploadUrl: string;
        publicUrl: string;
        assetId: string;
      };

      const uploadHeaders = { ...auth.headers, "content-type": file.type };
      const putResp = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file,
      });

      if (!putResp.ok) {
        throw new Error("Upload failed");
      }

      const registerResp = await fetch("/api/media/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          siteId: resolvedSiteId,
          role: "hero",
          kind: "image",
          src: uploadData.publicUrl,
          mime: file.type,
        }),
      });

      if (!registerResp.ok) {
        const data = await registerResp.json().catch(() => ({}));
        throw new Error(data.error || "Register failed");
      }

      const registerData = (await registerResp.json()) as { asset: { id: string } };
      await attachAsset(resolvedSiteId, registerData.asset.id, jsonHeaders);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const resolvedSiteId = resolveSiteId(siteId);
      if (!resolvedSiteId) {
        throw new Error("Site ID missing");
      }

      const auth = await buildAuthHeaders();
      if (!auth.token) {
        throw new Error("Sign in required");
      }
      const jsonHeaders = { ...auth.headers, "content-type": "application/json" };

      const generateResp = await fetch("/api/media/generate", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          siteId: resolvedSiteId,
          role: "hero",
          sectionId: sectionInstanceId,
        }),
      });

      const generateData = (await generateResp.json()) as { asset?: { id: string }; error?: string };
      if (!generateResp.ok || !generateData.asset?.id) {
        throw new Error(generateData.error || "Generation failed");
      }

      await attachAsset(resolvedSiteId, generateData.asset.id, jsonHeaders);
    } catch (err: any) {
      setError(err?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="absolute right-3 top-12 z-50 w-72 rounded-xl border border-border bg-background p-3 shadow-lg">
      <div className="text-sm font-medium">Replace hero media</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload a new hero background image.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs font-semibold"
          onClick={() => inputRef.current?.click()}
          disabled={loading || generating}
        >
          <UploadCloud className="h-4 w-4" />
          {loading ? "Uploading…" : "Choose file"}
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
          onClick={handleGenerate}
          disabled={loading || generating}
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating..." : "Generate image (Pro)"}
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground"
          onClick={onClose}
          disabled={loading || generating}
        >
          Cancel
        </button>
      </div>
      {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
