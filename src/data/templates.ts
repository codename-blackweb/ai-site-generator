import { Template } from "@/lib/template.types";

export const TEMPLATES: Template[] = [
  {
    id: "tpl-orbital-saas",
    name: "Orbital SaaS Landing",
    slug: "orbital-saas-landing",
    excerpt: "A conversion-first SaaS landing page built for clarity, trust, and momentum.",
    description:
      "Orbital is a modern SaaS landing template optimized for early traction and clear value communication. Designed to scale from MVP to paid acquisition without rework.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
      alt: "Modern SaaS landing page with hero, feature grid, and pricing",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["SaaS", "Conversion", "Minimal"],
    category: "Landing Page",
    featured: true,
    spec: {
      industries: ["SaaS", "Tech", "Startups"],
      tone: ["Minimal", "Confident", "Professional"],
      pages: ["Home", "Pricing", "FAQ", "Contact"],
      components: ["Hero", "Feature Grid", "Social Proof", "Pricing", "FAQ", "CTA"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a modern SaaS landing page focused on clarity, conversion, and trust.",
      defaults: {
        primaryCTA: "Start Free Trial",
        accentStyle: "subtle-gradient",
      },
    },
    seo: {
      metaTitle: "Orbital SaaS Landing Template",
      metaDescription: "A clean, conversion-focused SaaS landing page template designed for real products.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
  {
    id: "tpl-museum-portfolio",
    name: "Museum Portfolio",
    slug: "museum-portfolio",
    excerpt: "A gallery-first portfolio that treats work like curated exhibits.",
    description:
      "Museum Portfolio is built for designers, developers, and creators who want their work to feel intentional, timeless, and respected.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
      alt: "Minimal portfolio layout with gallery grid and large project imagery",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["Portfolio", "Minimal", "Gallery"],
    category: "Portfolio",
    featured: true,
    spec: {
      industries: ["Design", "Development", "Creative"],
      tone: ["Minimal", "Editorial", "Premium"],
      pages: ["Home", "Work", "Case Study", "About", "Contact"],
      components: ["Gallery Grid", "Project Modal", "Case Study Blocks"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a museum-quality portfolio focused on visual hierarchy and restraint.",
      defaults: {
        gridDensity: "spacious",
        typography: "editorial",
      },
    },
    seo: {
      metaTitle: "Museum Portfolio Template",
      metaDescription: "A minimalist portfolio template designed to showcase work with intention.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
  {
    id: "tpl-agency-pitch",
    name: "Agency Pitch Site",
    slug: "agency-pitch-site",
    excerpt: "A bold agency site built to sell outcomes, not services.",
    description:
      "This template is designed for agencies that lead with proof, process, and results—ideal for pitching high-value engagements.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
      alt: "Bold agency website with case studies and process timeline",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["Agency", "Bold", "Proof"],
    category: "Business",
    featured: false,
    spec: {
      industries: ["Agency", "Consulting"],
      tone: ["Bold", "Confident", "Direct"],
      pages: ["Home", "Services", "Work", "Process", "Contact"],
      components: ["Services Grid", "Case Studies", "Testimonials", "Process Timeline"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a high-impact agency website focused on proof, clarity, and outcomes.",
      defaults: {
        emphasis: "case-studies",
        visualWeight: "high",
      },
    },
    seo: {
      metaTitle: "Agency Pitch Website Template",
      metaDescription: "A bold agency website template built to convert credibility into leads.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
  {
    id: "tpl-creator-newsletter",
    name: "Creator Newsletter Hub",
    slug: "creator-newsletter-hub",
    excerpt: "A personal brand site designed to grow and retain an audience.",
    description:
      "Built for writers, founders, and solo creators who want a clean home for content, archives, and subscriptions.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
      alt: "Personal newsletter site with archive and subscribe focus",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["Newsletter", "Personal Brand", "Creator"],
    category: "Creator",
    featured: false,
    spec: {
      industries: ["Media", "Personal Brand", "Creator"],
      tone: ["Warm", "Clear", "Personal"],
      pages: ["Home", "Archive", "About", "Subscribe"],
      components: ["Subscribe CTA", "Post List", "Social Links"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a newsletter-centric personal site focused on readership growth.",
      defaults: {
        primaryCTA: "Subscribe",
        layoutStyle: "column",
      },
    },
    seo: {
      metaTitle: "Creator Newsletter Website Template",
      metaDescription: "A clean template for writers and creators focused on growing subscribers.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
  {
    id: "tpl-local-services",
    name: "Local Services Lead Gen",
    slug: "local-services-lead-gen",
    excerpt: "A trust-driven site optimized for local leads and bookings.",
    description:
      "Designed for local service providers who need credibility, clarity, and fast conversion without fluff.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
      alt: "Local services website with reviews and booking CTA",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["Local", "Lead Gen", "Trust"],
    category: "Business",
    featured: false,
    spec: {
      industries: ["Local Services", "Home Services"],
      tone: ["Trustworthy", "Clear", "Practical"],
      pages: ["Home", "Services", "Reviews", "Booking"],
      components: ["Review Wall", "Booking CTA", "Service Tiles"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a local services website focused on trust and lead generation.",
      defaults: {
        trustSignals: true,
        bookingEnabled: true,
      },
    },
    seo: {
      metaTitle: "Local Services Website Template",
      metaDescription: "A lead-generation template designed for local service businesses.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
  {
    id: "tpl-waitlist-teaser",
    name: "Product Waitlist Teaser",
    slug: "product-waitlist-teaser",
    excerpt: "A high-velocity prelaunch page built to capture demand fast.",
    description:
      "This template is optimized for early-stage products that need signal, interest, and email capture before launch.",
    featureImage: {
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      alt: "Minimal product teaser page with waitlist form",
      aspectRatio: "16:9",
    },
    status: "published",
    tags: ["Prelaunch", "Waitlist", "High-Velocity"],
    category: "Landing Page",
    featured: false,
    spec: {
      industries: ["Startups", "Product"],
      tone: ["Focused", "Urgent", "Minimal"],
      pages: ["Home"],
      components: ["Hero", "Benefits", "Waitlist Form", "FAQ"],
    },
    generatorPayload: {
      version: "v1",
      promptSeed: "Create a minimal prelaunch landing page optimized for waitlist signups.",
      defaults: {
        primaryCTA: "Join the Waitlist",
        layoutDensity: "tight",
      },
    },
    seo: {
      metaTitle: "Product Waitlist Landing Template",
      metaDescription: "A fast, focused landing page template for prelaunch products.",
    },
    createdAt: "2025-12-13T00:00:00.000Z",
  },
];

export function getPublishedTemplates() {
  return TEMPLATES.filter((t) => t.status === "published");
}

export function getTemplateBySlug(slug: string) {
  return TEMPLATES.find((t) => t.slug === slug);
}

export function getFeaturedTemplates() {
  return getPublishedTemplates().filter((t) => t.featured);
}
