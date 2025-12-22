import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WebsiteRenderer, WebsiteSpec } from "@/components/WebsiteRenderer";

export default function WebsitePreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [spec, setSpec] = useState<WebsiteSpec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("json_data")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (!error && data?.json_data) {
        setSpec(data.json_data as WebsiteSpec);
      }

      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Website not found.
      </div>
    );
  }

  return <WebsiteRenderer spec={spec} />;
}
