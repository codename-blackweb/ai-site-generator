import { Link } from "react-router-dom";
import type { BlogPost } from "@/lib/blog.types";

export function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-3xl border border-border/60 bg-background/70 overflow-hidden hover:bg-background/80 transition"
    >
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[340px] overflow-hidden">
          <img
            src={post.featureImage.src}
            alt={post.featureImage.alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="eager"
          />
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="text-xs text-muted-foreground">
            Featured · {post.category} · {post.readTime} min read
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">
            {post.title}
          </h2>
          <p className="mt-3 text-muted-foreground">{post.excerpt}</p>

          <div className="mt-6 text-sm text-muted-foreground">
            Read article <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
