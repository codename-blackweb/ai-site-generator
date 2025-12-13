import { BlogPost } from "@/lib/blog.types";

export const blogPosts: BlogPost[] = [
  {
    id: "post-1",
    title: "Why Most AI Website Generators Fail at the Last 10%",
    slug: "why-most-ai-website-generators-fail",
    excerpt:
      "AI website generators are shockingly good at getting you 90% of the way there. That final 10% is where almost all of them collapse.",
    content: `AI website builders excel at momentum. They generate layouts, sections, even copy at speeds that feel magical. The illusion breaks the moment you try to finish.

The last 10% of a site is not about generation. It’s about intent.

That’s where systems fail.

Navigation logic becomes inconsistent. Components don’t agree on data shape. Content feels interchangeable instead of deliberate. You end up fighting the tool instead of shipping.

The real failure isn’t design quality. It’s architectural humility.

Most generators assume the first draft is the product. Professionals know the first draft is just the scaffold.

The future of AI web tools isn’t more generation. It’s better constraints.`,
    featureImage: {
      src: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1600&q=80",
      alt: "Abstract gradient rings with focused center",
      aspectRatio: "16:9",
    },
    author: { name: "Lumen Editorial" },
    publishedAt: "2024-11-12T09:00:00Z",
    updatedAt: "2024-11-15T09:00:00Z",
    status: "published",
    tags: ["AI", "Web Builders", "Product Design"],
    category: "Analysis",
    readTime: 6,
    featured: true,
    seo: {
      metaTitle: "Why Most AI Website Generators Fail at the Last 10%",
      metaDescription:
        "AI website builders nail the first 90% and fail the last 10%. Here’s why that happens and how to avoid it.",
    },
  },
  {
    id: "post-2",
    title: "From Prompt to Production: What Actually Breaks",
    slug: "from-prompt-to-production-what-breaks",
    excerpt:
      "The handoff from “looks good” to “actually works” is where most AI-generated sites quietly fall apart.",
    content: `Prompts don’t encode edge cases.

They don’t think about routing collisions, state hydration, or content reuse. They generate pages, not systems.

What breaks first is always the same:
- Navigation loses hierarchy
- Content types bleed into each other
- Buttons exist without outcomes

Production systems need contracts. AI tools tend to avoid them.

That’s fixable—but only if schema comes before style.`,
    featureImage: {
      src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
      alt: "Developer workstation with code on screen",
      aspectRatio: "16:9",
    },
    author: { name: "Lumen Editorial" },
    publishedAt: "2024-11-14T10:00:00Z",
    status: "published",
    tags: ["AI", "UX", "Engineering"],
    category: "Build Notes",
    readTime: 4,
    featured: false,
    seo: {
      metaTitle: "From Prompt to Production: What Actually Breaks",
      metaDescription:
        "The critical issues when moving AI-generated sites into production and how to design around them.",
    },
  },
  {
    id: "post-3",
    title: "The Illusion of “No-Code”",
    slug: "the-illusion-of-no-code",
    excerpt: "No-code didn’t remove complexity. It relocated it—and hid the bill.",
    content: `Every serious no-code project eventually hits the same wall.

You’re either forced to learn the underlying system—or accept its limitations forever.

Abstraction is not elimination. It’s deferral.

The best tools don’t pretend otherwise.`,
    featureImage: {
      src: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80",
      alt: "Modern abstract shapes with gradients",
      aspectRatio: "16:9",
    },
    author: { name: "Lumen Editorial" },
    publishedAt: "2024-11-16T11:00:00Z",
    status: "published",
    tags: ["No-Code", "Product"],
    category: "Opinion",
    readTime: 3,
    featured: false,
    seo: {
      metaTitle: "The Illusion of No-Code",
      metaDescription: "Why no-code shifts complexity instead of removing it, and how to plan for that reality.",
    },
  },
  {
    id: "post-4",
    title: "Designing for Trust in Generated Interfaces",
    slug: "designing-for-trust-in-generated-interfaces",
    excerpt: "When interfaces are generated, trust must be designed—not assumed.",
    content: `Users can sense when an interface doesn’t understand itself.

Inconsistent spacing. Unclear hierarchy. Buttons that feel accidental.

Trust isn’t aesthetic polish. It’s coherence over time.

Generated systems need visual rules as strict as their data models.`,
    featureImage: {
      src: "https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1600&q=80",
      alt: "Futuristic hallway with symmetrical lighting",
      aspectRatio: "16:9",
    },
    author: { name: "Lumen Editorial" },
    publishedAt: "2024-11-18T12:00:00Z",
    status: "published",
    tags: ["Design", "UX", "Trust"],
    category: "Design",
    readTime: 4,
    featured: false,
    seo: {
      metaTitle: "Designing for Trust in Generated Interfaces",
      metaDescription:
        "How to create trustworthy AI-generated interfaces with coherent visual rules and hierarchy.",
    },
  },
];
