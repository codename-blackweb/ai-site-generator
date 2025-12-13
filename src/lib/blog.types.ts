export type BlogStatus = "draft" | "published";

export interface BlogSEO {
  metaTitle: string;
  metaDescription: string;
}

export interface BlogImage {
  src: string;
  alt: string;
  aspectRatio: "16:9";
}

export interface BlogAuthor {
  name: string;
  avatar?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featureImage: BlogImage;
  author: BlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  status: BlogStatus;
  tags: string[];
  category: string;
  readTime: number;
  featured: boolean;
  seo: BlogSEO;
}
