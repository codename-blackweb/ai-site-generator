import { useMemo } from "react";
import { blogPosts } from "@/data/blogPosts";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogCard } from "@/components/blog/BlogCard";

export function BlogPage() {
  const published = useMemo(
    () => blogPosts.filter((p) => p.status === "published").sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
    [],
  );
  const featured = published.find((p) => p.featured) || null;
  const others = featured ? published.filter((p) => p.id !== featured.id) : published;

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-6xl mx-auto">
          <header className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl">Blog</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Product thinking, build notes, and sharp takes—built to ship, not to posture.
            </p>
          </header>

          {featured && (
            <section className="mb-10">
              <FeaturedPost post={featured} />
            </section>
          )}

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

export default BlogPage;
