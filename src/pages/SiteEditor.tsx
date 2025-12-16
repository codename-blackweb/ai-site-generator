import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Globe, Lock, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWebsiteBySlugForOwner,
  useUpdateWebsite,
  useDomainsForWebsite,
  useAddDomain,
  useDeleteDomain,
} from "@/hooks/useWebsites";
import { supabase } from "@/integrations/supabase/client";

function safeParseJson(text: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "Invalid JSON" };
  }
}

export default function SiteEditor() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: website, isLoading } = useWebsiteBySlugForOwner(slug);
  const updateWebsite = useUpdateWebsite();

  const { data: domains } = useDomainsForWebsite(website?.id);
  const addDomain = useAddDomain();
  const deleteDomain = useDeleteDomain();

  const [domainInput, setDomainInput] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [title, setTitle] = useState("");
  const [nextSlug, setNextSlug] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (website) {
      setTitle(website.title ?? "");
      setNextSlug(website.slug ?? "");
      setIsPublic(!!website.is_public);
      setJsonText(JSON.stringify(website.json_data ?? {}, null, 2));
    }
  }, [website]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl mb-2">Sign in required</h1>
          <p className="text-muted-foreground mb-6">You must be signed in to edit.</p>
          <button
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
            onClick={() => navigate("/auth")}
          >
            Go to Auth
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl text-muted-foreground">Website not found (or not yours)</h1>
      </div>
    );
  }

  const handleSave = async () => {
    const parsed = safeParseJson(jsonText);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    try {
      await updateWebsite.mutateAsync({
        id: website.id,
        updates: {
          title: title || null,
          slug: nextSlug || null,
          is_public: isPublic,
          json_data: parsed.value,
        },
      });

      toast.success("Saved.");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const handleUploadThumbnail = async (file: File) => {
    if (!file) return;
    try {
      setUploading(true);

      const ext = file.name.split(".").pop() || "png";
      const path = `thumbnails/${website.user_id}/${website.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await updateWebsite.mutateAsync({
        id: website.id,
        updates: {
          thumbnail_url: publicUrl,
        },
      });

      toast.success("Thumbnail updated.");
    } catch (e: any) {
      toast.error(e?.message || "Thumbnail upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAddDomain = async () => {
    const d = domainInput.trim().toLowerCase();
    if (!d) return;

    // minimal sanity check
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      toast.error("Enter a valid domain (e.g., example.com)");
      return;
    }

    try {
      await addDomain.mutateAsync({ website_id: website.id, domain: d });
      setDomainInput("");
      toast.success("Domain added.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add domain");
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      await deleteDomain.mutateAsync({ id, website_id: website.id });
      toast.success("Domain removed.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove domain");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-6 py-10 max-w-5xl">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2">Edit Website</h1>
            <p className="text-muted-foreground">
              Owner-only editor. Public page:{" "}
              <a className="underline" href={`/site/${website.slug}`} target="_blank" rel="noreferrer">
                /site/{website.slug}
              </a>
            </p>
          </div>

          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
            onClick={handleSave}
            disabled={updateWebsite.isPending}
          >
            {updateWebsite.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-sm text-muted-foreground mb-2">Title</div>
            <input
              className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Website title"
            />
          </div>

          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-sm text-muted-foreground mb-2">Slug</div>
            <input
              className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border"
              value={nextSlug}
              onChange={(e) => setNextSlug(e.target.value)}
              placeholder="my-site-slug"
            />
          </div>

          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="text-sm text-muted-foreground mb-2">Visibility</div>
            <button
              className={`w-full px-3 py-2 rounded-lg border border-border flex items-center justify-center gap-2 ${
                isPublic ? "bg-primary text-primary-foreground" : "bg-secondary/40"
              }`}
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isPublic ? "Public" : "Draft"}
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display">Thumbnail</h2>
            {website.thumbnail_url ? (
              <a className="text-sm underline text-muted-foreground" href={website.thumbnail_url} target="_blank" rel="noreferrer">
                View current
              </a>
            ) : null}
          </div>

          <div className="flex flex-col md:flex-row items-start gap-4">
            <label className="px-4 py-2 rounded-lg border border-border bg-secondary/40 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : "Upload thumbnail"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadThumbnail(f);
                }}
                disabled={uploading}
              />
            </label>

            <div className="text-sm text-muted-foreground">
              Stored in your Supabase Storage bucket <b>assets</b> and saved to <code>websites.thumbnail_url</code>.
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card mb-10">
          <h2 className="text-xl font-display mb-4">Custom Domains</h2>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-secondary/40 border border-border"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="example.com"
            />
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              onClick={handleAddDomain}
              disabled={addDomain.isPending}
            >
              {addDomain.isPending ? "Adding…" : "Add domain"}
            </button>
          </div>

          <div className="space-y-2">
            {(domains || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
                <div className="font-mono text-sm">{d.domain}</div>
                <button
                  className="px-3 py-1.5 rounded-lg border border-border bg-background flex items-center gap-2"
                  onClick={() => handleDeleteDomain(d.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            ))}
            {(!domains || domains.length === 0) ? (
              <div className="text-sm text-muted-foreground">No domains yet.</div>
            ) : null}
          </div>

          <div className="text-sm text-muted-foreground mt-6">
            DNS + hosting rule required to route your domain to this app. You’ll configure that after the code is live.
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-xl font-display mb-4">Website JSON</h2>
          <p className="text-sm text-muted-foreground mb-3">
            This is exactly what renders your public site. Keep it valid JSON.
          </p>
          <textarea
            className="w-full min-h-[420px] font-mono text-sm p-4 rounded-xl bg-secondary/30 border border-border"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
