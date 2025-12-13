import { Link } from "react-router-dom";
import type { BlogPost } from "@/lib/blog.types";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-border/60 bg-background/60 overflow-hidden hover:bg-background/80 transition"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={post.featureImage.src}
          alt={post.featureImage.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="p-5">
        <div className="text-xs text-muted-foreground">
          {post.category} · {post.readTime} min read
        </div>
        <div className="mt-2 text-lg font-semibold leading-snug">
          {post.title}
        </div>
        <div className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {post.excerpt}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[11px] rounded-full border border-border/70 bg-background/50 px-2 py-1 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
