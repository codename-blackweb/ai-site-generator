import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Website = {
  id: string;
  title: string | null;
  slug: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
};

const fallbackThumb =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=900&fit=crop";

export default function PublicPortfolio() {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);

  useEffect(() => {
    if (!username) return;

    const run = async () => {
      try {
        setLoading(true);

        // First attempt: look up profile by username
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, bio")
          .eq("username", username)
          .maybeSingle();

        if (pErr) throw pErr;

        if (p) {
          setProfile(p as Profile);

          const { data: w, error: wErr } = await supabase
            .from("websites")
            .select("id, title, slug, thumbnail_url, created_at")
            .eq("user_id", p.id)
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (wErr) throw wErr;
          setWebsites((w || []) as Website[]);
          return;
        }

        // Fallback: treat param as user_id when no profile found
        const { data: w, error: wErr } = await supabase
          .from("websites")
          .select("id, title, slug, thumbnail_url, created_at, user_id")
          .eq("user_id", username)
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        if (wErr) throw wErr;

        if (w && w.length > 0) {
          setProfile({
            id: username,
            username,
            avatar_url: null,
            bio: null,
          });
          setWebsites(w as Website[]);
        } else {
          setProfile(null);
          setWebsites([]);
        }
      } catch {
        setProfile(null);
        setWebsites([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl text-muted-foreground">Portfolio not found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-6 py-14">
        <div className="flex items-center gap-4 mb-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-secondary/50" />
          )}

          <div>
            <h1 className="text-3xl font-display">{profile.username}</h1>
            {profile.bio ? (
              <p className="text-muted-foreground">{profile.bio}</p>
            ) : null}
          </div>
        </div>

        {websites.length === 0 ? (
          <div className="text-muted-foreground">No public websites yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {websites.map((w) => (
              <Link
                key={w.id}
                to={`/site/${w.slug}`}
                className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition"
              >
                <div
                  className="h-52 bg-cover bg-center"
                  style={{ backgroundImage: `url(${w.thumbnail_url || fallbackThumb})` }}
                />
                <div className="p-5">
                  <div className="font-display text-lg mb-1">
                    {w.title || "Untitled"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    /site/{w.slug}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
