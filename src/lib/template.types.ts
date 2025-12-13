export type TemplateStatus = "draft" | "published";

export interface TemplateImage {
  src: string;
  alt: string;
  aspectRatio: "16:9";
}

export interface TemplateSEO {
  metaTitle: string;
  metaDescription: string;
}

export interface TemplateSpec {
  industries: string[];
  tone: string[];
  pages: string[];
  components: string[];
}

export interface GeneratorPayload {
  version: "v1";
  promptSeed: string;
  defaults: Record<string, any>;
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  excerpt: string;
  description: string;
  featureImage: TemplateImage;
  status: TemplateStatus;
  tags: string[];
  category: string;
  featured: boolean;
  spec: TemplateSpec;
  generatorPayload: GeneratorPayload;
  seo: TemplateSEO;
  createdAt: string;
  updatedAt?: string;
}
