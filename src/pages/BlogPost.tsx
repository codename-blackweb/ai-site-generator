import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";

function isoToReadable(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="prose prose-invert max-w-none">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) return <h1 key={idx}>{line.replace("# ", "")}</h1>;
        if (line.startsWith("## ")) return <h2 key={idx}>{line.replace("## ", "")}</h2>;
        if (line.startsWith("- ")) return <li key={idx}>{line.replace("- ", "")}</li>;
        if (line.trim() === "") return <div key={idx} className="h-4" />;
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const post = useMemo(() => blogPosts.find((p) => p.slug === slug), [slug]);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <article className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden border border-border/60 bg-background/70">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={post.featureImage.src}
                alt={post.featureImage.alt}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="p-6 md:p-8">
              <div className="text-xs text-muted-foreground">
                {post.category} · {post.readTime} min read · {isoToReadable(post.publishedAt)}
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight">
                {post.title}
              </h1>
              <p className="mt-3 text-muted-foreground">{post.excerpt}</p>
            </div>
          </div>

          <div className="mt-10">
            <Markdown content={post.content} />
          </div>
        </div>
      </article>
    </main>
  );
}

export default BlogPostPage;
