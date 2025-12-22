import type { Handler } from "@netlify/functions";
import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";
import type { ResponseInputItem } from "openai/resources/responses";
import { z } from "zod";
import path from "path";
import {
  applyIntentMutation,
  deriveIntentSignals,
  inferDesignIntent,
  type DesignIntent,
  type IntentMutation,
} from "../../src/lib/designIntent";
import { generateVisualSystem } from "../../src/lib/visualSystem";
import { generateSiteMedia } from "../../src/lib/media";
import { getOptionalAuth } from "./auth";

const resolveDatabaseUrl = (): string => {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl && rawUrl.startsWith("file:")) {
    const filePath = rawUrl.slice("file:".length);
    if (filePath.startsWith("/")) {
      return rawUrl;
    }
    return `file:${path.resolve(process.cwd(), filePath)}`;
  }
  return `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;
};

const prisma = new PrismaClient({
  datasources: {
    db: { url: resolveDatabaseUrl() },
  },
});
const MAX_HISTORY = 20;
const DEFAULT_MODEL = "gpt-5-mini";
const ADVISOR_TEMPERATURE = 0.3;
const BUILDER_TEMPERATURE = 0.5;
const PREVIEW_BASE_URL = process.env.PREVIEW_BASE_URL?.trim() || "https://preview.exhibit.local";
const PRESCRIPTIVE_MODEL = process.env.PRESCRIPTIVE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;

type AssistantMode = "advisor" | "clarifier" | "builder" | "ready" | "voice" | "audit" | "intent";
type BlogPresence = "yes" | "no" | "undecided";
type VoiceLevel = "general" | "professional" | "expert" | "undecided";
type VoiceTone = "conservative" | "balanced" | "expressive" | "undecided";
type VoiceAssertiveness = "reserved" | "confident" | "direct" | "undecided";
type VoiceVerbosity = "tight" | "standard" | "rich" | "undecided";

type ContractContext = {
  purpose: string | null;
  audience: string | null;
  action: string | null;
  tone: string | null;
  blog: BlogPresence | null;
};

type VoiceContract = {
  audienceLevel: VoiceLevel | null;
  tone: VoiceTone | null;
  assertiveness: VoiceAssertiveness | null;
  verbosity: VoiceVerbosity | null;
};

type SiteFacts = {
  ownerName?: string;
  role?: string;
  location?: string;
  contact?: { email?: string; link?: string };
  projects?: Array<{ title: string; outcome?: string; stack?: string; link?: string }>;
  metrics?: Array<{ label: string; value: string; context?: string }>;
  testimonials?: Array<{ quote: string; author: string; role?: string; company?: string }>;
};

type PrescriptiveIntent =
  | "diagnostic"
  | "corrective"
  | "optimizing"
  | "strategic"
  | "blocking"
  | "confirming";

type PrescriptiveResponse = {
  summary: string;
  intent: PrescriptiveIntent;
  confidence: number;
  findings?: { content: string; severity?: "low" | "medium" | "high" }[];
  recommendations?: { content: string; actionId?: string; confidence?: number }[];
  warnings?: { content: string; severity?: "low" | "medium" | "high" }[];
  questions?: { content: string }[];
  nextActions?: { content: string; actionId?: string }[];
  blocking?: boolean;
  meta: { relatedContext: string[]; expiresAt?: number };
};

type PrescriptiveMessage = {
  id: string;
  role: "ai";
  type: "chatter" | "insight" | "recommendation" | "warning" | "blocker" | "question" | "action";
  content: string;
  title?: string;
  severity?: "low" | "medium" | "high";
  confidence?: number;
  actionId?: string;
  createdAt: number;
};

type InputRole = "system" | "user" | "assistant";

const inputText = (role: InputRole, text: string): ResponseInputItem => ({
  role,
  content: [{ type: "input_text", text }],
});

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

type PrescriptiveMemory = {
  recommendations: { key: string; content: string }[];
  lastReminderKey?: string | null;
};

const createMessageId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

const buildRecommendationKey = (rec: { actionId?: string; content: string }) => {
  if (rec.actionId) return `action:${rec.actionId}`;
  return `content:${rec.content.toLowerCase().trim()}`;
};

const buildPrescriptiveMessages = (response: PrescriptiveResponse): PrescriptiveMessage[] => {
  const now = Date.now();
  const messages: PrescriptiveMessage[] = [
    {
      id: createMessageId(),
      role: "ai",
      type: "chatter",
      content: response.summary,
      confidence: response.confidence,
      createdAt: now,
    },
  ];

  response.findings?.forEach((finding) => {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "insight",
      title: "Finding",
      content: finding.content,
      severity: finding.severity,
      createdAt: now,
    });
  });

  response.recommendations?.forEach((rec) => {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "recommendation",
      title: "Recommendation",
      content: rec.content,
      confidence: rec.confidence,
      actionId: rec.actionId,
      createdAt: now,
    });
  });

  response.warnings?.forEach((warning) => {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "warning",
      title: "Warning",
      content: warning.content,
      severity: warning.severity,
      createdAt: now,
    });
  });

  response.questions?.forEach((question) => {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "question",
      title: "Clarify",
      content: question.content,
      createdAt: now,
    });
  });

  response.nextActions?.forEach((action) => {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "action",
      title: "Next Action",
      content: action.content,
      actionId: action.actionId,
      createdAt: now,
    });
  });

  if (response.blocking) {
    messages.push({
      id: createMessageId(),
      role: "ai",
      type: "blocker",
      title: "Blocked",
      content: "I need missing context before proceeding.",
      createdAt: now,
    });
  }

  return messages;
};

type ToolName =
  | "addSection"
  | "addPage"
  | "reorderSections"
  | "generateSectionContent"
  | "rewriteSectionContent"
  | "switchSectionVariant"
  | "applyTheme";

const ADVISOR_PROMPT =
  "You are the Exhibit AI operator. Answer questions and ask for missing contract fields. " +
  "Do not build, do not propose layouts, do not write page copy, and do not pick themes. " +
  "Be concise and confident.";

const BUILDER_PROMPT =
  "You are the Exhibit AI operator in builder mode. The contract is complete. " +
  "Explain intent before action. Never invent features. Never bypass the contract. " +
  "Be concise and concrete.";

const REQUIRED_FIELDS = ["purpose", "audience", "action", "tone", "blog"] as const;

const CLARIFICATION_QUESTIONS: Record<typeof REQUIRED_FIELDS[number], string> = {
  purpose: "What is this site for?",
  audience: "Who is it primarily for?",
  action: "What should visitors do when they land?",
  tone: "Should this feel more conservative or expressive (pick one direction, not vibes)?",
  blog: "Do you want a blog? (yes/no/undecided)",
};

const VOICE_FIELDS = ["audienceLevel", "tone", "assertiveness", "verbosity"] as const;

const VOICE_QUESTIONS: Record<typeof VOICE_FIELDS[number], string> = {
  audienceLevel: "Audience level (general, professional, expert, or undecided)?",
  tone: "Tone (conservative, balanced, expressive, or undecided)?",
  assertiveness: "Assertiveness (reserved, confident, direct, or undecided)?",
  verbosity: "Verbosity (tight, standard, rich, or undecided)?",
};

const voiceLevelEnum = z.enum(["general", "professional", "expert", "undecided"]);
const voiceToneEnum = z.enum(["conservative", "balanced", "expressive", "undecided"]);
const voiceAssertivenessEnum = z.enum(["reserved", "confident", "direct", "undecided"]);
const voiceVerbosityEnum = z.enum(["tight", "standard", "rich", "undecided"]);

const voiceContractSchema = z
  .object({
    audienceLevel: voiceLevelEnum.nullable(),
    tone: voiceToneEnum.nullable(),
    assertiveness: voiceAssertivenessEnum.nullable(),
    verbosity: voiceVerbosityEnum.nullable(),
  })
  .strict();

const PAGE_IDS = ["home", "about", "work", "services", "pricing", "blog", "contact"] as const;
type PageId = (typeof PAGE_IDS)[number];

const PAGE_GOALS = [
  "credibility",
  "conversion",
  "education",
  "exploration",
  "trust",
  "navigation",
] as const;
type PageGoal = (typeof PAGE_GOALS)[number];

const SECTION_IDS = [
  "heroEditorial",
  "heroSplit",
  "heroMinimal",
  "proofMetrics",
  "logoCloud",
  "testimonialStack",
  "caseGrid",
  "caseFeatured",
  "valueProps",
  "processSteps",
  "serviceList",
  "pricingTable",
  "faq",
  "timeline",
  "bioLong",
  "values",
  "ctaPrimary",
  "ctaSecondary",
  "contactForm",
  "blogIndex",
  "postList",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const THEME_IDS = [
  "editorialDark",
  "editorialLight",
  "studioNeutral",
  "studioContrast",
  "minimalMono",
  "expressiveColor",
] as const;
type ThemeId = (typeof THEME_IDS)[number];

const RELEASE_STATES = ["draft", "preview", "published"] as const;
type ReleaseState = (typeof RELEASE_STATES)[number];

const ADVISORY_MODES = ["assistive", "prescriptive"] as const;
type AdvisoryMode = (typeof ADVISORY_MODES)[number];

const AUDIT_MODES = [
  "structure",
  "content",
  "voice",
  "presentation",
  "conversion",
  "coherence",
] as const;
type AuditMode = (typeof AUDIT_MODES)[number];

const THEME_REGISTRY: Record<ThemeId, { label: string; intent: string }> = {
  editorialDark: {
    label: "Editorial Dark",
    intent: "authority and thought leadership with high-contrast typography",
  },
  editorialLight: {
    label: "Editorial Light",
    intent: "clarity and long-form reading with bright surfaces",
  },
  studioNeutral: {
    label: "Studio Neutral",
    intent: "portfolio clarity for studios and agencies",
  },
  studioContrast: {
    label: "Studio Contrast",
    intent: "product and SaaS emphasis with crisp hierarchy",
  },
  minimalMono: {
    label: "Minimal Mono",
    intent: "restraint and credibility with minimal color noise",
  },
  expressiveColor: {
    label: "Expressive Color",
    intent: "creative energy for bold, expressive brands",
  },
};

const SECTION_VARIANTS: Record<SectionId, { default: string; variants: string[] }> = {
  heroEditorial: { default: "stacked", variants: ["stacked", "split"] },
  heroSplit: { default: "balanced", variants: ["balanced", "reverse"] },
  heroMinimal: { default: "centered", variants: ["centered", "left"] },
  proofMetrics: { default: "inline", variants: ["inline", "cards"] },
  logoCloud: { default: "grid", variants: ["grid", "row"] },
  testimonialStack: { default: "stacked", variants: ["stacked", "cards"] },
  caseGrid: { default: "threeColumn", variants: ["threeColumn", "twoColumn"] },
  caseFeatured: { default: "split", variants: ["split", "stacked"] },
  valueProps: { default: "columns", variants: ["columns", "rows"] },
  processSteps: { default: "numbered", variants: ["numbered", "timeline"] },
  serviceList: { default: "cards", variants: ["cards", "list"] },
  pricingTable: { default: "cards", variants: ["cards", "compact"] },
  faq: { default: "accordion", variants: ["accordion", "list"] },
  timeline: { default: "vertical", variants: ["vertical", "horizontal"] },
  bioLong: { default: "singleColumn", variants: ["singleColumn"] },
  values: { default: "grid", variants: ["grid", "list"] },
  ctaPrimary: { default: "banner", variants: ["banner", "split"] },
  ctaSecondary: { default: "banner", variants: ["banner", "split"] },
  contactForm: { default: "split", variants: ["split", "stacked"] },
  blogIndex: { default: "standard", variants: ["standard"] },
  postList: { default: "grid", variants: ["grid", "list"] },
};

const ALLOWED_SECTIONS: Record<PageId, readonly SectionId[]> = {
  home: [
    "heroEditorial",
    "heroSplit",
    "heroMinimal",
    "valueProps",
    "proofMetrics",
    "logoCloud",
    "testimonialStack",
    "caseGrid",
    "caseFeatured",
    "ctaPrimary",
  ],
  about: [
    "heroMinimal",
    "bioLong",
    "timeline",
    "values",
    "testimonialStack",
    "ctaSecondary",
  ],
  work: ["heroMinimal", "caseGrid", "caseFeatured", "testimonialStack", "ctaSecondary"],
  services: ["heroSplit", "serviceList", "processSteps", "faq", "ctaPrimary"],
  pricing: ["heroMinimal", "pricingTable", "faq", "ctaPrimary"],
  blog: ["heroMinimal", "blogIndex", "postList", "ctaSecondary"],
  contact: ["heroMinimal", "contactForm", "ctaPrimary"],
};

const DISALLOWED_FIELDS = new Set(
  [
    "copy",
    "text",
    "headline",
    "subhead",
    "theme",
    "color",
    "font",
    "layout",
    "spacing",
    "animation",
    "html",
    "css",
    "jsx",
    "content",
  ].map((value) => value.toLowerCase()),
);

const sectionEnum = z.enum(SECTION_IDS);
const pageGoalEnum = z.enum(PAGE_GOALS);

const pageSchema = z
  .object({
    goal: pageGoalEnum,
    sections: z.array(sectionEnum),
  })
  .strict();

const pagesSchema = z
  .object({
    home: pageSchema.optional(),
    about: pageSchema.optional(),
    work: pageSchema.optional(),
    services: pageSchema.optional(),
    pricing: pageSchema.optional(),
    blog: pageSchema.optional(),
    contact: pageSchema.optional(),
  })
  .strict();

const prescriptiveResponseSchema = z.object({
  summary: z.string(),
  intent: z.enum(["diagnostic", "corrective", "optimizing", "strategic", "blocking", "confirming"]),
  confidence: z.number().min(0).max(1),
  findings: z
    .array(
      z.object({
        content: z.string(),
        severity: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .optional(),
  recommendations: z
    .array(
      z.object({
        content: z.string(),
        actionId: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
  warnings: z
    .array(
      z.object({
        content: z.string(),
        severity: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .optional(),
  questions: z.array(z.object({ content: z.string() })).optional(),
  nextActions: z
    .array(
      z.object({
        content: z.string(),
        actionId: z.string().optional(),
      }),
    )
    .optional(),
  blocking: z.boolean().optional(),
  meta: z.object({
    relatedContext: z.array(z.string()).min(1),
    expiresAt: z.number().optional(),
  }),
});

const sitePlanSchema = z
  .object({
    pages: pagesSchema,
  })
  .strict()
  .superRefine((plan, ctx) => {
    const entries = Object.entries(plan.pages) as [PageId, z.infer<typeof pageSchema> | undefined][];
    const activePages = entries.filter(([, value]) => value);

    if (activePages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one page is required.",
        path: ["pages"],
      });
      return;
    }

    for (const [pageId, page] of activePages) {
      if (!page) continue;
      if (page.sections.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} requires at least one section.`,
          path: ["pages", pageId, "sections"],
        });
      }

      const allowed = ALLOWED_SECTIONS[pageId];
      const invalidSections = page.sections.filter((section) => !allowed.includes(section));
      if (invalidSections.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} contains invalid sections: ${invalidSections.join(", ")}`,
          path: ["pages", pageId, "sections"],
        });
      }

      const heroes = page.sections.filter((section) => section.startsWith("hero"));
      if (heroes.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} must include exactly one hero section.`,
          path: ["pages", pageId, "sections"],
        });
      } else if (page.sections[0] !== heroes[0]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} hero must be the first section.`,
          path: ["pages", pageId, "sections"],
        });
      }

      if (page.sections.includes("ctaPrimary") && page.sections[page.sections.length - 1] !== "ctaPrimary") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} ctaPrimary must be the last section.`,
          path: ["pages", pageId, "sections"],
        });
      }

      const uniqueSections = new Set(page.sections);
      if (uniqueSections.size !== page.sections.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} sections must be unique.`,
          path: ["pages", pageId, "sections"],
        });
      }

      if (
        pageId !== "blog" &&
        (page.sections.includes("blogIndex") || page.sections.includes("postList"))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pageId} cannot contain blog sections.`,
          path: ["pages", pageId, "sections"],
        });
      }
    }
  });

type SitePlan = z.infer<typeof sitePlanSchema>;

type PlanStatus = "proposed" | "confirmed" | "rejected";

type StoredPlan = {
  status: PlanStatus;
  plan: SitePlan;
  updatedAt: string;
};

type SiteSnapshot = {
  siteId: string;
  themeId: ThemeId | null;
  pages: Array<{
    pageId: PageId;
    goal: PageGoal;
    sections: Array<{
      sectionInstanceId: string;
      sectionId: SectionId;
      variantId: string | null;
      hasContent: boolean;
    }>;
  }>;
};

type FullSiteState = {
  siteId: string;
  releaseState: ReleaseState;
  themeId: ThemeId | null;
  voiceContract: VoiceContract | null;
  pages: Array<{
    pageId: PageId;
    goal: PageGoal;
    position: number;
    sections: Array<{
      sectionId: SectionId;
      position: number;
      variantId: string | null;
      content: unknown | null;
    }>;
  }>;
};

type ReleaseSnapshotInfo = {
  id: string;
  state: "preview" | "published";
  label: string | null;
  createdAt: string;
};

type AuditFinding = {
  severity: "low" | "medium" | "high";
  area: string;
  issue: string;
  rationale: string;
  recommendation?: string;
};

type RecommendationType =
  | "moveProofAboveCTA"
  | "addMissingProof"
  | "removeRedundantSection"
  | "simplifyPageStructure"
  | "strengthenHeroClarity"
  | "tightenCTAPlacement"
  | "reduceContentDensity"
  | "alignThemeToPurpose"
  | "switchSectionVariantForFocus"
  | "leaveAsIs";

type RecommendationScores = {
  impact: number;
  alignment: number;
  confidence: number;
  disruption: number;
  score: number;
};

type PrescriptiveRecommendation = {
  id?: string;
  recommendationId: RecommendationType;
  key: string;
  phase: "structure" | "content" | "presentation" | "none";
  title: string;
  rationale: string;
  impactSummary: string;
  context: string;
  criteriaText: {
    impact: string;
    alignment: string;
    confidence: string;
    disruption: string;
  };
  scores: RecommendationScores;
  tool: ToolName | null;
  args: Record<string, unknown>;
  tradeoffs: string[];
  whyNotAlternatives: string[];
  requiresConfirmation: true;
};

type RecommendationDraft = {
  auditRunId?: string | null;
  mode: AuditMode;
  recommendations: PrescriptiveRecommendation[];
  selectedIndex?: number | null;
};

const CANONICAL_BLOG_PAGE: { goal: PageGoal; sections: SectionId[] } = {
  goal: "education",
  sections: ["heroMinimal", "blogIndex", "postList", "ctaSecondary"],
};

const DEFAULT_PAGE_SECTIONS: Record<PageId, SectionId[]> = {
  home: ["heroEditorial", "valueProps", "proofMetrics", "ctaPrimary"],
  about: ["heroMinimal", "bioLong", "values", "ctaSecondary"],
  work: ["heroMinimal", "caseGrid", "testimonialStack", "ctaSecondary"],
  services: ["heroSplit", "serviceList", "processSteps", "faq", "ctaPrimary"],
  pricing: ["heroMinimal", "pricingTable", "faq", "ctaPrimary"],
  blog: ["heroMinimal", "blogIndex", "postList", "ctaSecondary"],
  contact: ["heroMinimal", "contactForm", "ctaPrimary"],
};

const PROOF_SECTIONS = new Set<SectionId>([
  "proofMetrics",
  "logoCloud",
  "testimonialStack",
  "caseGrid",
  "caseFeatured",
]);

const RECOMMENDATION_CATALOG = {
  moveProofAboveCTA: { phase: "structure" },
  addMissingProof: { phase: "structure" },
  removeRedundantSection: { phase: "structure" },
  simplifyPageStructure: { phase: "structure" },
  strengthenHeroClarity: { phase: "content" },
  tightenCTAPlacement: { phase: "content" },
  reduceContentDensity: { phase: "content" },
  alignThemeToPurpose: { phase: "presentation" },
  switchSectionVariantForFocus: { phase: "presentation" },
  leaveAsIs: { phase: "none" },
} as const;

const toolCallSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("addPage"),
    arguments: z.object({
      pageId: z.enum(PAGE_IDS),
      goal: pageGoalEnum,
      sections: z.array(sectionEnum),
    }),
  }),
  z.object({
    tool: z.literal("addSection"),
    arguments: z.object({
      pageId: z.enum(PAGE_IDS),
      sectionId: sectionEnum,
      position: z.number().int().min(0).optional(),
    }),
  }),
  z.object({
    tool: z.literal("reorderSections"),
    arguments: z.object({
      pageId: z.enum(PAGE_IDS),
      orderedSectionIds: z.array(sectionEnum),
    }),
  }),
  z.object({
    tool: z.literal("enableBlog"),
    arguments: z.object({}).strict(),
  }),
  z.object({
    tool: z.literal("none"),
    arguments: z.object({}).strict(),
  }),
]);

const contentToolCallSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("generateSectionContent"),
    arguments: z.object({
      pageId: z.enum(PAGE_IDS),
      sectionInstanceId: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("rewriteSectionContent"),
    arguments: z.object({
      sectionInstanceId: z.string().min(1),
      instruction: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("none"),
    arguments: z.object({}).strict(),
  }),
]);

const presentationToolCallSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("applyTheme"),
    reason: z.string().min(1).optional(),
    arguments: z.object({
      themeId: z.enum(THEME_IDS),
    }),
  }),
  z.object({
    tool: z.literal("switchSectionVariant"),
    reason: z.string().min(1).optional(),
    arguments: z.object({
      sectionInstanceId: z.string().min(1),
      variantId: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("none"),
    reason: z.string().min(1).optional(),
    arguments: z.object({}).strict(),
  }),
]);

const releaseToolCallSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("createPreview"),
    reason: z.string().min(1).optional(),
    arguments: z.object({
      label: z.string().min(1).optional(),
    }),
  }),
  z.object({
    tool: z.literal("publishSnapshot"),
    reason: z.string().min(1).optional(),
    arguments: z.object({
      snapshotId: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("rollbackToSnapshot"),
    reason: z.string().min(1).optional(),
    arguments: z.object({
      snapshotId: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("none"),
    reason: z.string().min(1).optional(),
    arguments: z.object({}).strict(),
  }),
]);

const BANNED_WORDS = [
  "cutting-edge",
  "innovative",
  "innovation",
  "next-level",
  "best-in-class",
  "world-class",
  "game-changing",
  "disruptive",
  "leverage",
  "synergy",
  "solutions",
  "unlock",
  "seamless",
  "robust",
  "powerful",
  "scalable",
  "leading",
  "state-of-the-art",
  "future-proof",
  "mission-critical",
  "revolutionary",
  "unparalleled",
  "end-to-end",
  "holistic",
];

const BANNED_PATTERNS = [
  /\b(best|greatest|ultimate|perfect)\b/i,
  /\b(very|extremely|highly)\b/i,
  /\bdesigned to\b.*\b(impact|transform|elevate)\b/i,
];

const nonEmptyString = z.string().min(1);

const CONTENT_SCHEMA_SNIPPETS: Record<SectionId, string> = {
  heroEditorial: '{"headline": string, "subhead?": string, "primaryActionLabel?": string}',
  heroSplit:
    '{"headline": string, "subhead?": string, "primaryActionLabel?": string, "secondaryActionLabel?": string}',
  heroMinimal: '{"headline": string, "subhead?": string}',
  proofMetrics: '{"metrics": [{"label": string, "value": string}] }',
  logoCloud: '{"intro?": string, "organizations": string[]}',
  testimonialStack: '{"testimonials": [{"quote": string, "attribution": string, "role?": string}] }',
  caseGrid: '{"intro?": string, "items": [{"title": string, "outcome": string}] }',
  caseFeatured: '{"title": string, "summary": string, "outcome": string}',
  valueProps: '{"items": [{"title": string, "description": string}] }',
  processSteps: '{"steps": [{"title": string, "description": string}] }',
  serviceList: '{"services": [{"name": string, "description": string}] }',
  pricingTable:
    '{"tiers": [{"name": string, "price": string, "description?": string, "features": string[]}] }',
  faq: '{"questions": [{"question": string, "answer": string}] }',
  timeline: '{"events": [{"label": string, "description": string}] }',
  bioLong: '{"body": string}',
  values: '{"values": [{"name": string, "description": string}] }',
  ctaPrimary: '{"headline": string, "actionLabel": string}',
  ctaSecondary: '{"headline": string, "actionLabel": string}',
  contactForm: '{"headline": string, "description?": string}',
  blogIndex: '{"intro?": string}',
  postList: '{"intro?": string}',
};

const SECTION_FIELD_ORDER: Record<SectionId, string[]> = {
  heroEditorial: ["headline", "subhead", "primaryActionLabel"],
  heroSplit: ["headline", "subhead", "primaryActionLabel", "secondaryActionLabel"],
  heroMinimal: ["headline", "subhead"],
  proofMetrics: ["metrics[].value", "metrics[].label"],
  logoCloud: ["intro", "organizations[]"],
  testimonialStack: ["testimonials[].quote", "testimonials[].attribution", "testimonials[].role"],
  caseGrid: ["intro", "items[].title", "items[].outcome"],
  caseFeatured: ["title", "summary", "outcome"],
  valueProps: ["items[].title", "items[].description"],
  processSteps: ["steps[].title", "steps[].description"],
  serviceList: ["services[].name", "services[].description"],
  pricingTable: ["tiers[].name", "tiers[].price", "tiers[].description", "tiers[].features[]"],
  faq: ["questions[].question", "questions[].answer"],
  timeline: ["events[].label", "events[].description"],
  bioLong: ["body"],
  values: ["values[].name", "values[].description"],
  ctaPrimary: ["headline", "actionLabel"],
  ctaSecondary: ["headline", "actionLabel"],
  contactForm: ["headline", "description"],
  blogIndex: ["intro"],
  postList: ["intro"],
};

const expandFieldPaths = (value: unknown, pattern: string) => {
  const segments = pattern.split(".");
  const results: Array<{ path: string; value: unknown }> = [];

  const walk = (node: unknown, index: number, prefix: string) => {
    if (index >= segments.length) return;
    if (!node || typeof node !== "object") return;

    const segment = segments[index];
    const isArray = segment.endsWith("[]");
    const key = isArray ? segment.slice(0, -2) : segment;
    const next = (node as Record<string, unknown>)[key];
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    if (isArray) {
      if (!Array.isArray(next)) return;
      for (let i = 0; i < next.length; i += 1) {
        const item = next[i];
        const itemPrefix = `${nextPrefix}[${i}]`;
        if (index === segments.length - 1) {
          if (item !== undefined && item !== null) {
            results.push({ path: itemPrefix, value: item });
          }
        } else {
          walk(item, index + 1, itemPrefix);
        }
      }
      return;
    }

    if (index === segments.length - 1) {
      if (next !== undefined && next !== null) {
        results.push({ path: nextPrefix, value: next });
      }
      return;
    }

    walk(next, index + 1, nextPrefix);
  };

  walk(value, 0, "");
  return results;
};

const contentSchemas: Record<SectionId, z.ZodTypeAny> = {
  heroEditorial: z
    .object({
      headline: nonEmptyString,
      subhead: nonEmptyString.optional(),
      primaryActionLabel: nonEmptyString.optional(),
    })
    .strict(),
  heroSplit: z
    .object({
      headline: nonEmptyString,
      subhead: nonEmptyString.optional(),
      primaryActionLabel: nonEmptyString.optional(),
      secondaryActionLabel: nonEmptyString.optional(),
    })
    .strict(),
  heroMinimal: z
    .object({
      headline: nonEmptyString,
      subhead: nonEmptyString.optional(),
    })
    .strict(),
  proofMetrics: z
    .object({
      metrics: z
        .array(
          z
            .object({
              label: nonEmptyString,
              value: nonEmptyString,
            })
            .strict(),
        )
        .min(2)
        .max(5),
    })
    .strict(),
  logoCloud: z
    .object({
      intro: nonEmptyString.optional(),
      organizations: z.array(nonEmptyString).min(3).max(12),
    })
    .strict(),
  testimonialStack: z
    .object({
      testimonials: z
        .array(
          z
            .object({
              quote: nonEmptyString,
              attribution: nonEmptyString,
              role: nonEmptyString.optional(),
            })
            .strict(),
        )
        .min(2)
        .max(4),
    })
    .strict(),
  caseGrid: z
    .object({
      intro: nonEmptyString.optional(),
      items: z
        .array(
          z
            .object({
              title: nonEmptyString,
              outcome: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(6),
    })
    .strict(),
  caseFeatured: z
    .object({
      title: nonEmptyString,
      summary: nonEmptyString,
      outcome: nonEmptyString,
    })
    .strict(),
  valueProps: z
    .object({
      items: z
        .array(
          z
            .object({
              title: nonEmptyString,
              description: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(5),
    })
    .strict(),
  processSteps: z
    .object({
      steps: z
        .array(
          z
            .object({
              title: nonEmptyString,
              description: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(6),
    })
    .strict(),
  serviceList: z
    .object({
      services: z
        .array(
          z
            .object({
              name: nonEmptyString,
              description: nonEmptyString,
            })
            .strict(),
        )
        .min(2)
        .max(6),
    })
    .strict(),
  pricingTable: z
    .object({
      tiers: z
        .array(
          z
            .object({
              name: nonEmptyString,
              price: nonEmptyString,
              description: nonEmptyString.optional(),
              features: z.array(nonEmptyString).min(3).max(7),
            })
            .strict(),
        )
        .min(2)
        .max(4),
    })
    .strict(),
  faq: z
    .object({
      questions: z
        .array(
          z
            .object({
              question: nonEmptyString,
              answer: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(6),
    })
    .strict(),
  timeline: z
    .object({
      events: z
        .array(
          z
            .object({
              label: nonEmptyString,
              description: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(6),
    })
    .strict(),
  bioLong: z
    .object({
      body: nonEmptyString,
    })
    .strict(),
  values: z
    .object({
      values: z
        .array(
          z
            .object({
              name: nonEmptyString,
              description: nonEmptyString,
            })
            .strict(),
        )
        .min(3)
        .max(5),
    })
    .strict(),
  ctaPrimary: z
    .object({
      headline: nonEmptyString,
      actionLabel: nonEmptyString,
    })
    .strict(),
  ctaSecondary: z
    .object({
      headline: nonEmptyString,
      actionLabel: nonEmptyString,
    })
    .strict(),
  contactForm: z
    .object({
      headline: nonEmptyString,
      description: nonEmptyString.optional(),
    })
    .strict(),
  blogIndex: z
    .object({
      intro: nonEmptyString.optional(),
    })
    .strict(),
  postList: z
    .object({
      intro: nonEmptyString.optional(),
    })
    .strict(),
};


const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "POST, OPTIONS",
};

const streamHeadersBase = {
  "content-type": "text/plain; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-expose-headers": "x-conversation-id,x-site-id,x-mode",
};

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

async function streamAdvisorResponse(params: {
  openai: OpenAI;
  input: ResponseInputItem[];
  temperature: number;
  conversationId: string;
  siteId?: string | null;
}) {
  const abortController = new AbortController();
  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = await params.openai.responses.stream(
    {
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: params.temperature,
      input: params.input,
    },
    { signal: abortController.signal },
  );

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            assistantText += event.delta;
            controller.enqueue(encoder.encode(event.delta));
          }
        }

        if (assistantText.trim().length > 0) {
          await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: assistantText,
              conversationId: params.conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: params.conversationId },
            data: { updatedAt: new Date() },
          });
        }

        controller.close();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          controller.close();
          return;
        }
        controller.error(error);
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  const headers: Record<string, string> = {
    ...streamHeadersBase,
    "x-conversation-id": params.conversationId,
  };
  if (params.siteId) {
    headers["x-site-id"] = params.siteId;
  }
  headers["x-mode"] = "advisor";

  return new Response(readable, { headers });
}

function extractOutputText(response: unknown) {
  const data = response as {
    output_text?: string | null;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  return (
    data?.output_text ??
    data?.output?.[0]?.content?.find((item) => item?.type === "output_text")?.text ??
    data?.output?.[0]?.content?.[0]?.text ??
    null
  );
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseBlogPresence(value: string): BlogPresence | null {
  const text = value.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/(^y(es)?$|^sure$|^yeah$|^yep$|^required$)/.test(text)) return "yes";
  if (/(^n(o)?$|^nope$|^nah$|^not required$)/.test(text)) return "no";
  if (/(^undecided$|^not sure$|^unsure$|^maybe$)/.test(text)) return "undecided";
  return null;
}

function normalizeVoiceValue(field: typeof VOICE_FIELDS[number], value: string) {
  const text = value.trim().toLowerCase();
  if (field === "audienceLevel") {
    if (["general", "professional", "expert", "undecided"].includes(text)) return text as VoiceLevel;
  }
  if (field === "tone") {
    if (["conservative", "balanced", "expressive", "undecided"].includes(text)) return text as VoiceTone;
  }
  if (field === "assertiveness") {
    if (["reserved", "confident", "direct", "undecided"].includes(text)) return text as VoiceAssertiveness;
  }
  if (field === "verbosity") {
    if (["tight", "standard", "rich", "undecided"].includes(text)) return text as VoiceVerbosity;
  }
  return null;
}

function extractVoiceAnswers(message: string) {
  const answers: Partial<VoiceContract> = {};
  let structured = false;
  const numbered = [...message.matchAll(/^\s*(\d+)[\).\:-]\s*(.+)$/gm)];

  if (numbered.length > 0) {
    structured = true;
    for (const match of numbered) {
      const index = Number(match[1]) - 1;
      const value = normalizeAnswer(match[2] || "");
      if (!value) continue;
      if (index === 0) {
        const normalized = normalizeVoiceValue("audienceLevel", value);
        if (normalized) answers.audienceLevel = normalized;
      }
      if (index === 1) {
        const normalized = normalizeVoiceValue("tone", value);
        if (normalized) answers.tone = normalized;
      }
      if (index === 2) {
        const normalized = normalizeVoiceValue("assertiveness", value);
        if (normalized) answers.assertiveness = normalized;
      }
      if (index === 3) {
        const normalized = normalizeVoiceValue("verbosity", value);
        if (normalized) answers.verbosity = normalized;
      }
    }
  }

  if (!structured) {
    const lines = message.split(/\n+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(
        /^(audience level|tone|assertiveness|verbosity)\s*[:\-]\s*(.+)$/i,
      );
      if (!match) continue;
      const label = match[1].toLowerCase();
      const value = normalizeAnswer(match[2] || "");
      if (!value) continue;

      if (label === "audience level") {
        const normalized = normalizeVoiceValue("audienceLevel", value);
        if (normalized) answers.audienceLevel = normalized;
      }
      if (label === "tone") {
        const normalized = normalizeVoiceValue("tone", value);
        if (normalized) answers.tone = normalized;
      }
      if (label === "assertiveness") {
        const normalized = normalizeVoiceValue("assertiveness", value);
        if (normalized) answers.assertiveness = normalized;
      }
      if (label === "verbosity") {
        const normalized = normalizeVoiceValue("verbosity", value);
        if (normalized) answers.verbosity = normalized;
      }
    }
  }

  return { answers, structured };
}

function getMissingVoiceFields(voice: VoiceContract) {
  const missing: typeof VOICE_FIELDS[number][] = [];
  if (!voice.audienceLevel) missing.push("audienceLevel");
  if (!voice.tone) missing.push("tone");
  if (!voice.assertiveness) missing.push("assertiveness");
  if (!voice.verbosity) missing.push("verbosity");
  return missing;
}

function buildVoiceMessage(missing: typeof VOICE_FIELDS[number][]) {
  const questions = missing.map((key) => `- ${VOICE_QUESTIONS[key]}`);
  return {
    text:
      "Before I write any content, I need a voice contract:\n" +
      questions.join("\n") +
      "\nReply in a numbered list so I can lock this in.",
    questions: missing.map((key) => VOICE_QUESTIONS[key]),
  };
}

function extractClarificationAnswers(message: string) {
  const answers: {
    purpose?: string;
    audience?: string;
    action?: string;
    tone?: string;
    blog?: BlogPresence;
  } = {};

  let structured = false;
  const numbered = [...message.matchAll(/^\s*(\d+)[\).\:-]\s*(.+)$/gm)];

  if (numbered.length > 0) {
    structured = true;
    for (const match of numbered) {
      const index = Number(match[1]) - 1;
      const value = normalizeAnswer(match[2] || "");
      if (!value) continue;
      if (index === 0) answers.purpose = value;
      if (index === 1) answers.audience = value;
      if (index === 2) answers.action = value;
      if (index === 3) answers.tone = value;
      if (index === 4) {
        const blog = parseBlogPresence(value);
        if (blog !== null) answers.blog = blog;
      }
    }
  }

  if (!structured) {
    const lines = message.split(/\n+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(
        /^(site purpose|purpose|audience|primary action|primary conversion|conversion|action|tone axis|tone|blog)\s*[:\-]\s*(.+)$/i,
      );
      if (!match) continue;
      const label = match[1].toLowerCase();
      const value = normalizeAnswer(match[2] || "");
      if (!value) continue;

      if (label === "site purpose" || label === "purpose") answers.purpose = value;
      if (label === "audience") answers.audience = value;
      if (label === "primary action" || label === "primary conversion" || label === "conversion" || label === "action")
        answers.action = value;
      if (label === "tone axis" || label === "tone") answers.tone = value;
      if (label === "blog") {
        const blog = parseBlogPresence(value);
        if (blog !== null) answers.blog = blog;
      }
    }

    const inlineMatches = [
      ...message.matchAll(
        /(?:^|[.\n;])\s*(site purpose|purpose|audience|primary action|primary conversion|conversion|action|tone axis|tone|blog)\s*[:\-]\s*([^.\\n;]+)/gi,
      ),
    ];
    for (const match of inlineMatches) {
      const label = match[1]?.toLowerCase();
      const value = normalizeAnswer(match[2] || "");
      if (!label || !value) continue;

      if (label === "site purpose" || label === "purpose") answers.purpose = value;
      if (label === "audience") answers.audience = value;
      if (label === "primary action" || label === "primary conversion" || label === "conversion" || label === "action")
        answers.action = value;
      if (label === "tone axis" || label === "tone") answers.tone = value;
      if (label === "blog") {
        const blog = parseBlogPresence(value);
        if (blog !== null) answers.blog = blog;
      }
    }
  }

  return { answers, structured };
}

function buildContextSummary(context: ContractContext) {
  const lines: string[] = [];
  if (context.purpose) lines.push(`Site purpose: ${context.purpose}`);
  if (context.audience) lines.push(`Primary audience: ${context.audience}`);
  if (context.action) lines.push(`Primary action: ${context.action}`);
  if (context.tone) lines.push(`Tone axis: ${context.tone}`);
  if (context.blog) lines.push(`Blog: ${context.blog}`);
  if (lines.length === 0) return "";
  return `Contract (must respect):\n- ${lines.join("\n- ")}`;
}

function buildSiteSummary(state: FullSiteState | null) {
  if (!state || state.pages.length === 0) return "No pages have been created yet.";
  const lines = state.pages.map((page) => {
    const sections = page.sections.map((section) => section.sectionId).join(", ");
    return `${page.pageId} (${page.goal}): ${sections}`;
  });
  return `Pages:\n- ${lines.join("\n- ")}`;
}

async function generatePrescriptiveResponse(params: {
  openai: OpenAI;
  message: string;
  siteId?: string | null;
  pageId?: string | null;
  context: ContractContext;
}) {
  const siteState = params.siteId ? await getFullSiteState(params.siteId) : null;
  const contextSummary = buildContextSummary(params.context);
  const siteSummary = buildSiteSummary(siteState);
  const pageContext = params.pageId ? `Current page: ${params.pageId}` : "Current page: unknown";
  const pageGoal = params.pageId
    ? siteState?.pages.find((page) => page.pageId === params.pageId)?.goal ?? null
    : null;
  const relatedContext = [
    `site:${params.siteId ?? "unknown"}`,
    `page:${params.pageId ?? "unknown"}`,
    `goal:${pageGoal ?? "unknown"}`,
    `purpose:${params.context.purpose ?? "unknown"}`,
    `audience:${params.context.audience ?? "unknown"}`,
    `action:${params.context.action ?? "unknown"}`,
    `tone:${params.context.tone ?? "unknown"}`,
  ];

  const systemPrompt =
    "You are the Exhibit Prescriptive Engine. Return ONLY valid JSON that matches the schema. " +
    "Do not include markdown or commentary.\n" +
    "Rules:\n" +
    "- Do not provide recommendations without findings.\n" +
    "- If goal or audience is missing, intent must be \"blocking\" and include clarifying questions.\n" +
    "- Use intent to reflect posture (diagnostic, corrective, optimizing, strategic, blocking, confirming).\n" +
    "- Keep summary executive and short.\n" +
    "- Ensure meta.relatedContext is populated.\n";

  const userPrompt =
    `${contextSummary}\n${pageContext}\n${siteSummary}\n\n` +
    `User request: ${params.message}\n\n` +
    "Return JSON with keys: summary, intent, confidence, findings?, recommendations?, warnings?, questions?, nextActions?, blocking?, meta.";

  let lastError = "Unknown error";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await params.openai.responses.create({
      model: PRESCRIPTIVE_MODEL,
      temperature: 0.2,
      input: [
        inputText("system", systemPrompt),
        inputText("user", userPrompt),
        ...(attempt > 0
          ? [inputText("system", "Your previous output was invalid. Return ONLY valid JSON for the schema.")]
          : []),
      ],
    });

    const output = extractOutputText(response);
    if (!output) {
      lastError = "No output";
      continue;
    }

    const jsonText = extractJsonFromText(output) ?? output;
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      lastError = "Invalid JSON";
      continue;
    }

    const validated = prescriptiveResponseSchema.safeParse(parsed);
    if (!validated.success) {
      lastError = "Schema validation failed";
      continue;
    }

    const value = validated.data as PrescriptiveResponse;
    value.meta = {
      relatedContext: relatedContext,
      expiresAt: value.meta.expiresAt,
    };
    return value;
  }

  throw new Error(lastError);
}

function getMissingFields(context: ContractContext) {
  const missing: typeof REQUIRED_FIELDS[number][] = [];
  if (!context.purpose) missing.push("purpose");
  if (!context.audience) missing.push("audience");
  if (!context.action) missing.push("action");
  if (!context.tone) missing.push("tone");
  if (context.blog === null) missing.push("blog");
  return missing;
}

function buildClarificationMessage(missing: typeof REQUIRED_FIELDS[number][]) {
  const questions = missing.map((key) => `- ${CLARIFICATION_QUESTIONS[key]}`);
  return {
    text:
      "Before I build anything, I'm waiting on a few structured answers so I don't guess wrong:\n" +
      questions.join("\n") +
      "\nReply in a numbered list so I can lock this in.",
    questions: missing.map((key) => CLARIFICATION_QUESTIONS[key]),
  };
}

function detectBuildIntent(message: string) {
  return /(build|create|make( me)? a site|generate|start|plan|structure)/i.test(message);
}

function detectContentIntent(message: string) {
  const text = message.toLowerCase();
  if (/(add|remove|delete|reorder|move|enable|disable)\b/.test(text) && !/(copy|content|write|draft)/.test(text)) {
    return false;
  }
  return /(copy|content|write|draft|headline|subhead|rewrite|rephrase|shorten|tighten|expand|proofread|edit copy)/.test(
    text,
  );
}

function buildReadyMessage(context: ContractContext) {
  return (
    "Got it. I have enough to work with.\n" +
    `I'm going to propose a site structure optimized for ${context.purpose}, ` +
    `aimed at ${context.audience}, with a primary focus on ${context.action}.`
  );
}

function formatDesignIntent(intent: DesignIntent) {
  const visual = {
    minimal: "Minimal layouts",
    balanced: "Balanced layouts",
    expressive: "Expressive layouts",
  }[intent.visualGravity];
  const motion = {
    still: "Still motion",
    guided: "Guided motion",
    cinematic: "Cinematic motion",
  }[intent.motionEnergy];
  const density = {
    airy: "Airy spacing",
    neutral: "Neutral spacing",
    dense: "Dense spacing",
  }[intent.spatialDensity];
  const temperature = {
    cool: "Cool emotional tone",
    neutral: "Neutral emotional tone",
    warm: "Warm emotional tone",
  }[intent.emotionalTemperature];
  const prestige = {
    utilitarian: "Utilitarian finish",
    professional: "Professional finish",
    luxury: "Luxury finish",
  }[intent.prestigeLevel];

  return [visual, motion, density, temperature, prestige];
}

function buildDesignIntentMessage(intent: DesignIntent) {
  const lines = formatDesignIntent(intent).map((line) => `- ${line}`);
  return (
    "Before I design anything, I want to confirm the aesthetic direction I'm optimizing for.\n\n" +
    "Visual direction:\n" +
    `${lines.join("\n")}\n\n` +
    "You can:\n" +
    "1) Confirm\n" +
    "2) Make it calmer\n" +
    "3) Make it bolder\n" +
    "4) Make it more minimal"
  );
}

function parseIntentDecision(message: string): IntentMutation | null {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === "1" || /^confirm\b/.test(trimmed) || isAffirmative(trimmed)) return "confirm";
  if (trimmed === "2" || trimmed.includes("calmer")) return "calmer";
  if (trimmed === "3" || trimmed.includes("bolder")) return "bolder";
  if (trimmed === "4" || trimmed.includes("minimal")) return "minimal";
  return null;
}

function getDefaultVariant(sectionId: SectionId) {
  return SECTION_VARIANTS[sectionId]?.default ?? "default";
}

function isAllowedVariant(sectionId: SectionId, variantId: string) {
  const variants = SECTION_VARIANTS[sectionId]?.variants ?? [];
  return variants.includes(variantId);
}

function detectPresentationIntent(message: string) {
  return /(theme|visual|look|style|aesthetic|palette|color|typography|font|variant|layout|grid|column)/i.test(
    message,
  );
}

function detectReleaseIntent(message: string) {
  return /(preview|publish|go live|launch|release|deploy|rollback|roll back|revert|undo|share)/i.test(
    message,
  );
}

function detectAuditIntent(message: string) {
  return /(audit|review|critic|critique|evaluate|assessment|assess|diagnose|what'?s wrong|issues|weakness)/i.test(
    message,
  );
}

function detectRecommendationIntent(message: string) {
  return /(recommend|recommendation|suggest|what'?s next|next step|improve|optimi[sz]e|prioritize)/i.test(
    message,
  );
}

function inferAdvisoryModeChange(message: string): AdvisoryMode | null {
  if (/prescriptive mode|enable prescriptive|turn on prescriptive/i.test(message)) return "prescriptive";
  if (/assistive mode|enable assistive|turn on assistive/i.test(message)) return "assistive";
  return null;
}

function detectExplainIntent(message: string) {
  return /(why|explain|reasoning|rationale|why not|what'?s the reasoning)/i.test(message);
}

function inferAuditMode(message: string): AuditMode | null {
  const text = message.toLowerCase();
  if (text.includes("structure")) return "structure";
  if (text.includes("content") || text.includes("copy")) return "content";
  if (text.includes("voice") || text.includes("tone")) return "voice";
  if (text.includes("presentation") || text.includes("theme") || text.includes("visual")) return "presentation";
  if (text.includes("conversion") || text.includes("cta") || text.includes("action")) return "conversion";
  if (text.includes("coherence") || text.includes("alignment") || text.includes("consistency")) return "coherence";
  return null;
}

function extractRecommendationSelection(message: string) {
  const trimmed = message.trim().toLowerCase();
  const match = trimmed.match(/\b([1-3])\b/);
  if (match) return Number(match[1]);
  if (trimmed.includes("first")) return 1;
  if (trimmed.includes("second")) return 2;
  if (trimmed.includes("third")) return 3;
  return null;
}

function formatAuditResponse(findings: AuditFinding[]) {
  if (findings.length === 0) {
    return "No material issues found under this audit mode.";
  }

  const groups: Record<AuditFinding["severity"], AuditFinding[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const finding of findings) {
    groups[finding.severity].push(finding);
  }

  const lines: string[] = [];
  const addGroup = (label: string, items: AuditFinding[]) => {
    if (items.length === 0) return;
    lines.push(label);
    for (const item of items) {
      lines.push(`- ${item.area}: ${item.issue} ${item.rationale}`.trim());
    }
    lines.push("");
  };

  addGroup("High-impact issues", groups.high);
  addGroup("Medium-impact opportunities", groups.medium);
  addGroup("Low-impact polish", groups.low);

  return lines.join("\n").trim();
}

function formatPrescriptiveRecommendations(
  recommendations: PrescriptiveRecommendation[],
  voice: VoiceContract,
  options?: { includeLeaveAsIs?: boolean; includeTradeoffs?: boolean },
) {
  const actionable = recommendations.filter((rec) => rec.recommendationId !== "leaveAsIs");
  const leave = recommendations.find((rec) => rec.recommendationId === "leaveAsIs");

  if (actionable.length === 0) {
    return "I don't have any recommendations worth acting on right now.";
  }

  const verbosity = voice.verbosity ?? "standard";
  const assertiveness = voice.assertiveness ?? "confident";
  const audience = voice.audienceLevel ?? "professional";
  const useSoftener = assertiveness === "reserved" || audience === "general";

  const soften = (text: string) => {
    if (!useSoftener) return text;
    const lowered = text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
    return `This likely helps because ${lowered}`;
  };

  const lines: string[] = [];
  for (const [index, rec] of actionable.entries()) {
    const phaseLabel = rec.phase === "presentation" ? "Presentation" : rec.phase === "content" ? "Content" : "Structure";
    if (verbosity === "tight") {
      lines.push(`${index + 1}. ${rec.title} (${phaseLabel})`);
      continue;
    }

    lines.push(`${index + 1}. ${rec.title}`);
    lines.push(`Why: ${useSoftener ? soften(rec.rationale) : rec.rationale}`);
    if (verbosity !== "tight") {
      lines.push(`Impact: ${rec.impactSummary}`);
    }
    lines.push(`(${phaseLabel})`);
    if (options?.includeTradeoffs || audience === "expert" || verbosity === "rich") {
      if (rec.tradeoffs.length > 0) {
        lines.push(`Tradeoff: ${rec.tradeoffs[0]}`);
      }
    }
    lines.push("");
  }

  if (options?.includeLeaveAsIs !== false && leave) {
    if (verbosity === "tight") {
      lines.push(`- Leave ${leave.title} as-is.`);
    } else {
      lines.push(`I would leave ${leave.title} as-is.`);
    }
  }

  return lines.join("\n").trim();
}

function formatFirstPrescriptiveMoment(
  recommendations: PrescriptiveRecommendation[],
  voice: VoiceContract,
) {
  const actionable = recommendations.filter((rec) => rec.recommendationId !== "leaveAsIs");
  const leave = recommendations.find((rec) => rec.recommendationId === "leaveAsIs");
  if (actionable.length === 0 || !leave) {
    return "Your site is live. I don't have any high-confidence changes to recommend right now.";
  }

  const limited = actionable.slice(0, Math.min(2, getAudienceRecommendationLimit(voice)));
  const intro =
    "Your site is live and structurally coherent for its stated purpose.\n" +
    `Based on its purpose and audience, there ${limited.length === 1 ? "is 1 change" : "are 2 changes"} I would recommend prioritizing next—and one thing I would not touch.`;
  const body = formatPrescriptiveRecommendations(limited.concat(leave), voice, {
    includeLeaveAsIs: true,
    includeTradeoffs: voice.audienceLevel === "expert",
  });

  return `${intro}\n\n${body}\n\nDo you want me to apply the first recommendation, or would you rather discuss it?`;
}

function findPolicyViolations(sectionId: SectionId, content: unknown) {
  const violations: string[] = [];
  const strings: string[] = [];

  const collectStrings = (value: unknown) => {
    if (typeof value === "string") {
      strings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectStrings);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(collectStrings);
    }
  };

  collectStrings(content);

  const bannedWordPatterns = BANNED_WORDS.map((word) => new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\b`, "i"));
  const linkPattern = /(https?:\/\/|www\.)/i;
  const htmlPattern = /<[^>]+>/;
  const markdownPatterns = [
    /```/,
    /`/,
    /(^|\n)\s*#{1,6}\s/,
    /(^|\n)\s*[-*+]\s/,
    /(^|\n)\s*\d+\.\s/,
    /\[[^\]]+\]\([^)]+\)/,
  ];
  const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  for (const value of strings) {
    if (htmlPattern.test(value)) violations.push("html");
    if (linkPattern.test(value)) violations.push("links");
    if (markdownPatterns.some((pattern) => pattern.test(value))) violations.push("markdown");
    if (emojiPattern.test(value)) violations.push("emoji");

    const lower = value.toLowerCase();
    for (const wordPattern of bannedWordPatterns) {
      if (wordPattern.test(lower)) {
        violations.push("banned_words");
        break;
      }
    }
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(value)) {
        violations.push("banned_patterns");
        break;
      }
    }
  }

  if (sectionId === "bioLong") {
    const bulletPattern = /(^|\n)\s*[-*+]\s|(^|\n)\s*\d+\.\s/;
    if (strings.some((value) => bulletPattern.test(value))) {
      violations.push("bullets");
    }
  }

  return [...new Set(violations)];
}

function validateSectionContent(sectionId: SectionId, content: unknown) {
  const schema = contentSchemas[sectionId];
  if (!schema) {
    return { ok: false as const, errors: ["Unknown section schema"] };
  }

  const parsed = schema.safeParse(content);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((issue) => issue.message) };
  }

  const violations = findPolicyViolations(sectionId, parsed.data);
  if (violations.length > 0) {
    return { ok: false as const, errors: violations };
  }

  return { ok: true as const, content: parsed.data };
}

function isAffirmative(message: string) {
  const cleaned = message.trim().toLowerCase().replace(/[.!]+$/g, "");
  return /^(yes|yep|yeah|y|sure|ok|okay|do it|proceed|go ahead|sounds good|yes please|please proceed)$/.test(
    cleaned,
  );
}

function isNegative(message: string) {
  const cleaned = message.trim().toLowerCase().replace(/[.!]+$/g, "");
  return /^(no|nope|nah|not now|stop|not yet)$/.test(cleaned);
}

function extractJsonFromText(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function findDisallowedKeys(value: unknown, found: string[] = []) {
  if (!value) return found;
  if (Array.isArray(value)) {
    for (const item of value) findDisallowedKeys(item, found);
    return found;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (DISALLOWED_FIELDS.has(key.toLowerCase())) {
        found.push(key);
      }
      findDisallowedKeys(nested, found);
    }
  }
  return found;
}

function validateSitePlan(plan: unknown, context: ContractContext) {
  const disallowed = findDisallowedKeys(plan);
  if (disallowed.length > 0) {
    return { ok: false as const, errors: [`Disallowed fields: ${[...new Set(disallowed)].join(", ")}`] };
  }

  const parsed = sitePlanSchema.safeParse(plan);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((issue) => issue.message) };
  }

  if (context.blog === "no" && parsed.data.pages.blog) {
    return { ok: false as const, errors: ["Blog page not allowed when blog is 'no'."] };
  }

  return { ok: true as const, plan: parsed.data };
}

function buildPlanPrompt(
  contextSummary: string,
  userRequest: string,
  blogRule: string,
  currentPlan?: SitePlan,
) {
  const allowedSections = Object.fromEntries(
    Object.entries(ALLOWED_SECTIONS).map(([pageId, sections]) => [pageId, sections]),
  );
  return (
    `${BUILDER_PROMPT}\n\n` +
    "You are generating a SitePlan JSON only. No HTML, no JSX, no copy, no styling.\n" +
    "Output format:\n" +
    "1) One short paragraph explaining the structure intent.\n" +
    "2) Then a JSON object that matches the schema exactly.\n" +
    'Schema: {"pages": {"<pageId>": {"goal": "<PageGoal>", "sections": ["<SectionId>"]}}}\n\n' +
    `Allowed pages: ${PAGE_IDS.join(", ")}\n` +
    `Allowed goals: ${PAGE_GOALS.join(", ")}\n` +
    `Allowed sections: ${SECTION_IDS.join(", ")}\n` +
    `Allowed sections per page: ${JSON.stringify(allowedSections)}\n` +
    "Ordering rules:\n" +
    "- Hero section must be first and only one per page.\n" +
    "- ctaPrimary must be last if present.\n" +
    "- No duplicate sections.\n" +
    "- blogIndex/postList only on blog.\n" +
    "Disallowed fields anywhere: copy, text, headline, subhead, theme, color, font, layout, spacing, animation, html, css, jsx, content.\n" +
    `${blogRule}\n` +
    (contextSummary ? `\n${contextSummary}\n` : "") +
    (currentPlan ? `\nCurrent plan (revise if requested): ${JSON.stringify(currentPlan)}\n` : "") +
    `\nUser request: ${userRequest}\n`
  );
}

async function generateSitePlan(
  openai: OpenAI,
  context: ContractContext,
  userRequest: string,
  currentPlan?: SitePlan,
) {
  const contextSummary = buildContextSummary(context);
  let lastError = "Unknown error";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const blogRule =
      context.blog === "no"
        ? "Blog is not allowed for this site. Do not include a blog page."
        : "Blog is optional; include only if it supports the goal.";
    const prompt = buildPlanPrompt(contextSummary, userRequest, blogRule, currentPlan);
    const input = [
      inputText("system", prompt),
      ...(attempt > 0
        ? [
            inputText(
              "system",
              "Your previous output violated the Exhibit site plan schema. Regenerate using only allowed pages and sections.",
            ),
          ]
        : []),
    ];

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: BUILDER_TEMPERATURE,
      input,
    });

    const outputText = extractOutputText(response);
    if (!outputText) {
      lastError = "OpenAI returned no output";
      continue;
    }

    const jsonText = extractJsonFromText(outputText);
    if (!jsonText) {
      lastError = "No JSON detected";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      lastError = "JSON parse failed";
      continue;
    }

    const validation = validateSitePlan(parsed, context);
    if (!validation.ok) {
      lastError = validation.errors.join("; ");
      continue;
    }

    const explanation = outputText.slice(0, outputText.indexOf(jsonText)).trim();
    return {
      plan: validation.plan,
      explanation: explanation || "Here is the site plan I propose based on your contract.",
    };
  }

  return { plan: null, explanation: null, error: lastError };
}

async function loadContext(conversationId: string, fallback?: ContractContext): Promise<ContractContext> {
  const contextMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "context" },
    orderBy: { createdAt: "desc" },
  });

  if (!contextMessage) {
    return fallback ?? { purpose: null, audience: null, action: null, tone: null, blog: null };
  }

  try {
    const parsed = JSON.parse(contextMessage.content) as Partial<ContractContext>;
    return {
      purpose: parsed.purpose ?? null,
      audience: parsed.audience ?? null,
      action: parsed.action ?? null,
      tone: parsed.tone ?? null,
      blog: parsed.blog ?? null,
    };
  } catch {
    return fallback ?? { purpose: null, audience: null, action: null, tone: null, blog: null };
  }
}

async function saveContext(conversationId: string, context: ContractContext) {
  const contextMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "context" },
    orderBy: { createdAt: "desc" },
  });

  const payload = JSON.stringify(context);

  if (contextMessage) {
    await prisma.message.update({
      where: { id: contextMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "context",
        content: payload,
        conversationId,
      },
    });
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      sitePurpose: context.purpose,
      audience: context.audience,
      primaryConversion: context.action,
      toneAxis: context.tone,
      wantsBlog:
        context.blog === "yes" ? true : context.blog === "no" ? false : null,
    },
  });
}

async function loadSitePlan(conversationId: string): Promise<StoredPlan | null> {
  const planMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "sitePlan" },
    orderBy: { createdAt: "desc" },
  });

  if (!planMessage) return null;

  try {
    const parsed = JSON.parse(planMessage.content) as StoredPlan;
    if (!parsed?.status || !parsed?.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveSitePlan(conversationId: string, plan: SitePlan, status: PlanStatus) {
  const payload: StoredPlan = {
    status,
    plan,
    updatedAt: new Date().toISOString(),
  };

  const planMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "sitePlan" },
    orderBy: { createdAt: "desc" },
  });

  if (planMessage) {
    await prisma.message.update({
      where: { id: planMessage.id },
      data: { content: JSON.stringify(payload) },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "sitePlan",
        content: JSON.stringify(payload),
        conversationId,
      },
    });
  }
}

async function loadVoiceContract(siteId: string): Promise<VoiceContract> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { voiceContract: true },
  });

  if (!site || !site.voiceContract) {
    return { audienceLevel: null, tone: null, assertiveness: null, verbosity: null };
  }

  const parsed = voiceContractSchema.safeParse(site.voiceContract);
  if (!parsed.success) {
    return { audienceLevel: null, tone: null, assertiveness: null, verbosity: null };
  }

  return parsed.data;
}

async function loadSiteFacts(siteId: string): Promise<SiteFacts | null> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { facts: true },
  });
  if (!site || !site.facts || typeof site.facts !== "object") {
    return null;
  }
  return site.facts as SiteFacts;
}

async function saveVoiceContract(siteId: string, voice: VoiceContract) {
  await prisma.site.update({
    where: { id: siteId },
    data: {
      voiceContract: toJson(voice),
    },
  });
}

async function loadContentDraft(conversationId: string) {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "contentDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return null;

  try {
    return JSON.parse(draftMessage.content) as {
      sectionInstanceId: string;
      pageId: PageId;
      sectionId: SectionId;
      content: unknown;
      instruction?: string;
    };
  } catch {
    return null;
  }
}

async function saveContentDraft(conversationId: string, draft: {
  sectionInstanceId: string;
  pageId: PageId;
  sectionId: SectionId;
  content: unknown;
  instruction?: string;
}) {
  const payload = JSON.stringify(draft);
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "contentDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (draftMessage) {
    await prisma.message.update({
      where: { id: draftMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "contentDraft",
        content: payload,
        conversationId,
      },
    });
  }
}

async function clearContentDraft(conversationId: string) {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "contentDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return;

  await prisma.message.delete({ where: { id: draftMessage.id } });
}

type PresentationDraft =
  | {
      tool: "applyTheme";
      args: { themeId: ThemeId };
      reason: string;
    }
  | {
      tool: "switchSectionVariant";
      args: { sectionInstanceId: string; variantId: string };
      reason: string;
    };

type ReleaseDraft =
  | {
      tool: "createPreview";
      args: { label?: string };
      reason: string;
    }
  | {
      tool: "publishSnapshot";
      args: { snapshotId: string };
      reason: string;
    }
  | {
      tool: "rollbackToSnapshot";
      args: { snapshotId: string };
      reason: string;
    };

async function loadPresentationDraft(conversationId: string): Promise<PresentationDraft | null> {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "presentationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return null;

  try {
    return JSON.parse(draftMessage.content) as PresentationDraft;
  } catch {
    return null;
  }
}

async function savePresentationDraft(conversationId: string, draft: PresentationDraft) {
  const payload = JSON.stringify(draft);
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "presentationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (draftMessage) {
    await prisma.message.update({
      where: { id: draftMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "presentationDraft",
        content: payload,
        conversationId,
      },
    });
  }
}

async function clearPresentationDraft(conversationId: string) {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "presentationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return;

  await prisma.message.delete({ where: { id: draftMessage.id } });
}

async function loadReleaseDraft(conversationId: string): Promise<ReleaseDraft | null> {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "releaseDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return null;

  try {
    return JSON.parse(draftMessage.content) as ReleaseDraft;
  } catch {
    return null;
  }
}

async function saveReleaseDraft(conversationId: string, draft: ReleaseDraft) {
  const payload = JSON.stringify(draft);
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "releaseDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (draftMessage) {
    await prisma.message.update({
      where: { id: draftMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "releaseDraft",
        content: payload,
        conversationId,
      },
    });
  }
}

async function clearReleaseDraft(conversationId: string) {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "releaseDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return;

  await prisma.message.delete({ where: { id: draftMessage.id } });
}

async function loadRecommendationDraft(conversationId: string): Promise<RecommendationDraft | null> {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "recommendationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return null;

  try {
    return JSON.parse(draftMessage.content) as RecommendationDraft;
  } catch {
    return null;
  }
}

async function saveRecommendationDraft(conversationId: string, draft: RecommendationDraft) {
  const payload = JSON.stringify(draft);
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "recommendationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (draftMessage) {
    await prisma.message.update({
      where: { id: draftMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "recommendationDraft",
        content: payload,
        conversationId,
      },
    });
  }
}

async function clearRecommendationDraft(conversationId: string) {
  const draftMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "recommendationDraft" },
    orderBy: { createdAt: "desc" },
  });

  if (!draftMessage) return;

  await prisma.message.delete({ where: { id: draftMessage.id } });
}

async function loadPrescriptiveMemory(conversationId: string): Promise<PrescriptiveMemory | null> {
  const memoryMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "prescriptiveMemory" },
    orderBy: { createdAt: "desc" },
  });

  if (!memoryMessage) return null;

  try {
    return JSON.parse(memoryMessage.content) as PrescriptiveMemory;
  } catch {
    return null;
  }
}

async function savePrescriptiveMemory(conversationId: string, memory: PrescriptiveMemory) {
  const payload = JSON.stringify(memory);
  const memoryMessage = await prisma.message.findFirst({
    where: { conversationId, role: "system", mode: "prescriptiveMemory" },
    orderBy: { createdAt: "desc" },
  });

  if (memoryMessage) {
    await prisma.message.update({
      where: { id: memoryMessage.id },
      data: { content: payload },
    });
  } else {
    await prisma.message.create({
      data: {
        role: "system",
        mode: "prescriptiveMemory",
        content: payload,
        conversationId,
      },
    });
  }
}

async function hasExplainedRecommendation(conversationId: string, recommendationRecordId: string) {
  const explainMessages = await prisma.message.findMany({
    where: { conversationId, role: "system", mode: "recommendationExplain" },
  });

  for (const message of explainMessages) {
    try {
      const payload = JSON.parse(message.content) as { recommendationRecordId?: string };
      if (payload.recommendationRecordId === recommendationRecordId) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

async function saveRecommendationExplanation(conversationId: string, recommendationRecordId: string) {
  const payload = JSON.stringify({ recommendationRecordId });
  await prisma.message.create({
    data: {
      role: "system",
      mode: "recommendationExplain",
      content: payload,
      conversationId,
    },
  });
}

async function recordContentHistory(params: {
  siteId: string;
  sectionInstanceId: string;
  content: unknown;
  status: "accepted" | "rejected";
  instruction?: string;
  reason?: string;
  conversationId?: string | null;
}) {
  await prisma.sectionContentHistory.create({
    data: {
      siteId: params.siteId,
      sectionId: params.sectionInstanceId,
      content: toJson(params.content),
      status: params.status,
      instruction: params.instruction ?? null,
      reason: params.reason ?? null,
      conversationId: params.conversationId ?? null,
    },
  });
}

async function applyContentDraft(params: {
  siteId: string;
  draft: {
    sectionInstanceId: string;
    content: unknown;
    instruction?: string;
  };
  conversationId?: string | null;
}) {
  await prisma.section.update({
    where: { id: params.draft.sectionInstanceId },
    data: { content: toJson(params.draft.content) },
  });

  await recordContentHistory({
    siteId: params.siteId,
    sectionInstanceId: params.draft.sectionInstanceId,
    content: params.draft.content,
    status: "accepted",
    instruction: params.draft.instruction,
    conversationId: params.conversationId ?? null,
  });
}

async function getSiteSnapshot(siteId: string): Promise<SiteSnapshot | null> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      pages: {
        orderBy: { position: "asc" },
        include: { sections: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!site) return null;

  const pages = site.pages.map((page) => ({
    pageId: page.pageId as PageId,
    goal: page.goal as PageGoal,
    sections: page.sections.map((section) => ({
      sectionInstanceId: section.id,
      sectionId: section.sectionId as SectionId,
      variantId: section.variantId ?? null,
      hasContent: section.content !== null && section.content !== undefined,
    })),
  }));

  return { siteId: site.id, themeId: (site.themeId as ThemeId) ?? null, pages };
}

async function getFullSiteState(siteId: string): Promise<FullSiteState | null> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      pages: {
        orderBy: { position: "asc" },
        include: { sections: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!site) return null;

  const pages = site.pages.map((page) => ({
    pageId: page.pageId as PageId,
    goal: page.goal as PageGoal,
    position: page.position,
    sections: page.sections.map((section) => ({
      sectionId: section.sectionId as SectionId,
      position: section.position,
      variantId: section.variantId ?? null,
      content: section.content ?? null,
    })),
  }));

  return {
    siteId: site.id,
    releaseState: (site.releaseState as ReleaseState) ?? "draft",
    themeId: (site.themeId as ThemeId) ?? null,
    voiceContract: (site.voiceContract as VoiceContract) ?? null,
    pages,
  };
}

async function listReleaseSnapshots(siteId: string): Promise<ReleaseSnapshotInfo[]> {
  const snapshots = await prisma.snapshot.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    state: snapshot.state as "preview" | "published",
    label: snapshot.label ?? null,
    createdAt: snapshot.createdAt.toISOString(),
  }));
}

async function getLatestAuditRun(siteId: string) {
  const auditRun = await prisma.auditRun.findFirst({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  if (!auditRun) return null;
  return {
    id: auditRun.id,
    mode: auditRun.mode as AuditMode,
    findings: auditRun.findings as AuditFinding[],
  };
}

function buildPreviewUrl(snapshotId: string) {
  return `${PREVIEW_BASE_URL.replace(/\/$/, "")}/preview/${snapshotId}`;
}

function scoreRecommendation(params: {
  impact: number;
  alignment: number;
  confidence: number;
  disruption: number;
  misaligned?: boolean;
}) {
  const alignment = params.misaligned ? Math.min(params.alignment, 2) : params.alignment;
  const score =
    params.impact * 0.4 + alignment * 0.3 + params.confidence * 0.2 - params.disruption * 0.1;
  return {
    impact: params.impact,
    alignment,
    confidence: params.confidence,
    disruption: params.disruption,
    score,
  };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function collectContentStrings(content: unknown) {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      strings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(content);
  return strings;
}

function buildStructureFindings(state: FullSiteState, context: ContractContext): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const pageIds = new Set(state.pages.map((page) => page.pageId));
  const purposeText = (context.purpose ?? "").toLowerCase();

  if (/portfolio|case study|case studies|work|projects/.test(purposeText) && !pageIds.has("work")) {
    findings.push({
      severity: "medium",
      area: "Structure",
      issue: "Missing a Work page for a portfolio-oriented purpose.",
      rationale: "Visitors looking for proof won't see a dedicated body of work.",
      recommendation: "Add a Work page with case studies.",
    });
  }

  if (/saas|product|software|startup/.test(purposeText) && !pageIds.has("pricing")) {
    findings.push({
      severity: "medium",
      area: "Structure",
      issue: "No Pricing page for a product-led purpose.",
      rationale: "Decision-making is slowed without a clear pricing path.",
      recommendation: "Add a Pricing page.",
    });
  }

  if (/service|agency|studio|consult/.test(purposeText) && !pageIds.has("services")) {
    findings.push({
      severity: "medium",
      area: "Structure",
      issue: "Services page is missing for a service-led purpose.",
      rationale: "Visitors cannot understand the scope of what you offer.",
      recommendation: "Add a Services page.",
    });
  }

  for (const page of state.pages) {
    if (page.sections.length > 6) {
      findings.push({
        severity: "low",
        area: page.pageId,
        issue: "Page feels overloaded.",
        rationale: "Large section counts dilute focus and slow scanning.",
        recommendation: "Consider trimming or splitting sections.",
      });
    }

    const sectionIds = page.sections.map((section) => section.sectionId);
    if (sectionIds.includes("caseGrid") && sectionIds.includes("caseFeatured")) {
      findings.push({
        severity: "low",
        area: page.pageId,
        issue: "Two case study blocks compete for attention.",
        rationale: "Duplicated proof formats can blur the narrative.",
      });
    }
  }

  return findings;
}

function buildContentFindings(state: FullSiteState): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const page of state.pages) {
    for (const section of page.sections) {
      if (!section.content) {
        findings.push({
          severity: page.goal === "conversion" || page.pageId === "home" ? "high" : "medium",
          area: `${page.pageId} ${section.sectionId}`,
          issue: "Section is empty.",
          rationale: "Missing content blocks visitors from understanding the intent.",
          recommendation: "Generate content for this section.",
        });
        continue;
      }

      const strings = collectContentStrings(section.content);
      if (section.sectionId.startsWith("hero")) {
        const headline = strings[0] ?? "";
        if (headline && countWords(headline) > 12) {
          findings.push({
            severity: "medium",
            area: `${page.pageId} ${section.sectionId}`,
            issue: "Hero headline is long.",
            rationale: "Long headlines reduce clarity at first glance.",
            recommendation: "Tighten the headline.",
          });
        }
      }

      if (section.sectionId === "ctaPrimary") {
        const actionLabel = strings.find((value) => value.length > 0) ?? "";
        if (actionLabel && countWords(actionLabel) > 5) {
          findings.push({
            severity: "low",
            area: `${page.pageId} ${section.sectionId}`,
            issue: "CTA label is wordy.",
            rationale: "Short CTAs increase clarity and click intent.",
          });
        }
      }
    }
  }

  return findings;
}

function buildVoiceFindings(state: FullSiteState, voice: VoiceContract): AuditFinding[] {
  const findings: AuditFinding[] = [];

  if (!voice || Object.values(voice).some((value) => value === null)) {
    findings.push({
      severity: "high",
      area: "Voice",
      issue: "Voice contract is incomplete.",
      rationale: "Content cannot be evaluated for consistency without it.",
      recommendation: "Lock the voice contract.",
    });
    return findings;
  }

  for (const page of state.pages) {
    for (const section of page.sections) {
      if (!section.content) continue;
      const violations = findPolicyViolations(section.sectionId, section.content);
      if (violations.length > 0) {
        findings.push({
          severity: "medium",
          area: `${page.pageId} ${section.sectionId}`,
          issue: "Content violates voice constraints.",
          rationale: "Banned language erodes the intended tone.",
          recommendation: "Rewrite the section to remove banned language.",
        });
      }
    }
  }

  return findings;
}

function buildPresentationFindings(state: FullSiteState, voice: VoiceContract): AuditFinding[] {
  const findings: AuditFinding[] = [];

  if (!state.themeId) {
    findings.push({
      severity: "medium",
      area: "Presentation",
      issue: "Theme is not set.",
      rationale: "Without a theme, visual tone is undefined.",
      recommendation: "Apply a theme.",
    });
  }

  if (state.themeId === "expressiveColor" && voice.tone === "conservative") {
    findings.push({
      severity: "medium",
      area: "Presentation",
      issue: "Theme and tone are misaligned.",
      rationale: "Expressive color can undermine a conservative tone.",
      recommendation: "Switch to a more restrained theme.",
    });
  }

  const variantMap = new Map<SectionId, Set<string>>();
  for (const page of state.pages) {
    for (const section of page.sections) {
      const set = variantMap.get(section.sectionId) ?? new Set();
      set.add(section.variantId ?? getDefaultVariant(section.sectionId));
      variantMap.set(section.sectionId, set);
    }
  }

  for (const [sectionId, variants] of variantMap.entries()) {
    if (variants.size > 1) {
      findings.push({
        severity: "low",
        area: "Presentation",
        issue: `${sectionId} uses multiple variants across pages.`,
        rationale: "Inconsistent variants can reduce visual cohesion.",
        recommendation: "Standardize the variant for consistency.",
      });
    }
  }

  return findings;
}

function buildConversionFindings(state: FullSiteState): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const home = state.pages.find((page) => page.pageId === "home");
  if (home) {
    const sectionIds = home.sections.map((section) => section.sectionId);
    if (!sectionIds.includes("ctaPrimary")) {
      findings.push({
        severity: "high",
        area: "Home",
        issue: "Primary CTA is missing.",
        rationale: "Visitors have no clear next action.",
        recommendation: "Add a primary CTA to the home page.",
      });
    }

    const proofIndex = sectionIds.findIndex((id) => PROOF_SECTIONS.has(id));
    const ctaIndex = sectionIds.indexOf("ctaPrimary");
    if (proofIndex !== -1 && ctaIndex !== -1 && proofIndex > ctaIndex) {
      findings.push({
        severity: "medium",
        area: "Home",
        issue: "Proof appears after the primary CTA.",
        rationale: "Credibility should be established before asking for action.",
        recommendation: "Move proof sections above the CTA.",
      });
    }
  }

  const pricing = state.pages.find((page) => page.pageId === "pricing");
  if (pricing && !pricing.sections.some((section) => section.sectionId === "pricingTable")) {
    findings.push({
      severity: "high",
      area: "Pricing",
      issue: "Pricing table is missing.",
      rationale: "Visitors cannot evaluate costs.",
      recommendation: "Add a pricing table.",
    });
  }

  const services = state.pages.find((page) => page.pageId === "services");
  if (services && !services.sections.some((section) => section.sectionId === "serviceList")) {
    findings.push({
      severity: "medium",
      area: "Services",
      issue: "Service list is missing.",
      rationale: "Visitors cannot see what is offered.",
      recommendation: "Add a service list.",
    });
  }

  const contact = state.pages.find((page) => page.pageId === "contact");
  if (contact && !contact.sections.some((section) => section.sectionId === "contactForm")) {
    findings.push({
      severity: "high",
      area: "Contact",
      issue: "Contact form is missing.",
      rationale: "Interested visitors have no clear way to reach out.",
      recommendation: "Add a contact form.",
    });
  }

  return findings;
}

function buildCoherenceFindings(
  state: FullSiteState,
  context: ContractContext,
  voice: VoiceContract,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const structureFindings = buildStructureFindings(state, context);
  findings.push(...structureFindings.filter((finding) => finding.severity !== "low"));

  if (state.themeId && voice.tone === "expressive" && state.themeId === "minimalMono") {
    findings.push({
      severity: "low",
      area: "Coherence",
      issue: "Theme may be too restrained for an expressive tone.",
      rationale: "The visual system might underplay the intended energy.",
    });
  }

  return findings;
}

async function auditSiteTool(params: {
  siteId: string;
  mode: AuditMode;
  context: ContractContext;
  voice: VoiceContract;
  conversationId?: string | null;
}) {
  const state = await getFullSiteState(params.siteId);
  if (!state) throw new Error("Site not found");

  let findings: AuditFinding[] = [];
  switch (params.mode) {
    case "structure":
      findings = buildStructureFindings(state, params.context);
      break;
    case "content":
      findings = buildContentFindings(state);
      break;
    case "voice":
      findings = buildVoiceFindings(state, params.voice);
      break;
    case "presentation":
      findings = buildPresentationFindings(state, params.voice);
      break;
    case "conversion":
      findings = buildConversionFindings(state);
      break;
    case "coherence":
      findings = buildCoherenceFindings(state, params.context, params.voice);
      break;
  }

  const auditRun = await prisma.auditRun.create({
    data: {
      siteId: params.siteId,
      mode: params.mode,
      findings: findings as unknown as Prisma.InputJsonValue,
      conversationId: params.conversationId ?? null,
    },
  });

  return { findings, auditRunId: auditRun.id };
}

async function explainRecommendationTool(params: {
  siteId: string;
  recommendationId: RecommendationType;
}) {
  if (!(params.recommendationId in RECOMMENDATION_CATALOG)) {
    throw new Error("Unknown recommendation");
  }

  const recommendation = await prisma.recommendation.findFirst({
    where: { siteId: params.siteId, recommendationId: params.recommendationId },
    orderBy: { createdAt: "desc" },
  });
  if (!recommendation) {
    throw new Error("Recommendation not found");
  }

  if (recommendation.status === "rejected") {
    throw new Error("Recommendation rejected");
  }

  const criteriaText = recommendation.criteriaText as
    | { impact?: string; alignment?: string; confidence?: string; disruption?: string }
    | null;
  const tradeoffs = (recommendation.tradeoffs as string[] | null) ?? [];
  const alternatives = (recommendation.whyNotAlternatives as string[] | null) ?? [];

  return {
    explanation: {
      context: recommendation.context ?? recommendation.rationale,
      criteria: {
        impact: criteriaText?.impact ?? "This change improves a core goal.",
        alignment: criteriaText?.alignment ?? "It aligns with your stated intent.",
        confidence: criteriaText?.confidence ?? "This is based on known structure rules.",
        disruption: criteriaText?.disruption ?? "It limits change scope.",
      },
      tradeoffs: tradeoffs.length > 0 ? tradeoffs : ["It introduces minimal change without extra scope."],
      whyNotAlternatives: alternatives.length > 0 ? alternatives : [],
    },
  };
}

async function fetchRecommendationHistory(siteId: string) {
  const items = await prisma.recommendation.findMany({
    where: { siteId },
    select: { key: true, status: true },
  });

  const history = new Map<
    string,
    { accepted: number; rejected: number; deferred: number; proposed: number }
  >();

  for (const item of items) {
    const entry = history.get(item.key) ?? { accepted: 0, rejected: 0, deferred: 0, proposed: 0 };
    if (item.status === "accepted") entry.accepted += 1;
    if (item.status === "rejected") entry.rejected += 1;
    if (item.status === "deferred") entry.deferred += 1;
    if (item.status === "proposed") entry.proposed += 1;
    history.set(item.key, entry);
  }

  return history;
}

async function createRecommendations(params: {
  siteId: string;
  auditRunId?: string | null;
  recommendations: PrescriptiveRecommendation[];
  conversationId?: string | null;
}) {
  const created: PrescriptiveRecommendation[] = [];
  for (const rec of params.recommendations) {
    const record = await prisma.recommendation.create({
      data: {
        siteId: params.siteId,
        auditRunId: params.auditRunId ?? null,
        recommendationId: rec.recommendationId,
        key: rec.key,
        title: rec.title,
        rationale: rec.rationale,
        impactSummary: rec.impactSummary,
        context: rec.context,
        criteriaText: toJson(rec.criteriaText),
        phase: rec.phase,
        score: rec.scores.score,
        criteria: toJson({
          impact: rec.scores.impact,
          alignment: rec.scores.alignment,
          confidence: rec.scores.confidence,
          disruption: rec.scores.disruption,
        }),
        tool: rec.tool,
        args: toJson(rec.args ?? {}),
        tradeoffs: toJson(rec.tradeoffs ?? []),
        whyNotAlternatives: toJson(rec.whyNotAlternatives ?? []),
        status: "proposed",
        conversationId: params.conversationId ?? null,
      },
    });
    created.push({ ...rec, id: record.id });
  }
  return created;
}

async function updateRecommendationStatus(ids: string[], status: "accepted" | "rejected" | "deferred") {
  if (ids.length === 0) return;
  await prisma.recommendation.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
}

function suggestTheme(context: ContractContext, voice: VoiceContract): ThemeId {
  const purpose = (context.purpose ?? "").toLowerCase();
  if (/portfolio|studio|agency/.test(purpose)) return "studioNeutral";
  if (/saas|product|software/.test(purpose)) return "studioContrast";
  if (voice.tone === "expressive") return "expressiveColor";
  if (voice.tone === "conservative") return "minimalMono";
  return "editorialLight";
}

function isVoiceComplete(voice: VoiceContract) {
  return Object.values(voice).every((value) => value !== null);
}

function getAudienceRecommendationLimit(voice: VoiceContract) {
  switch (voice.audienceLevel) {
    case "general":
      return 1;
    case "expert":
      return 3;
    default:
      return 2;
  }
}

function isEligibleRecommendation(
  history: Map<string, { accepted: number; rejected: number; deferred: number; proposed: number }>,
  key: string,
) {
  const entry = history.get(key);
  if (!entry) return true;
  if (entry.rejected > 0 || entry.accepted > 0 || entry.proposed > 0) return false;
  if (entry.deferred >= 2) return false;
  return true;
}

function buildPreviouslyRecommendedReminder(
  recommendations: PrescriptiveRecommendation[],
  history: Map<string, { accepted: number; rejected: number; deferred: number; proposed: number }>,
) {
  const repeated = recommendations.find((rec) => {
    if (rec.recommendationId === "leaveAsIs") return false;
    const entry = history.get(rec.key);
    return entry ? entry.deferred > 0 : false;
  });
  if (!repeated) return null;
  return `I flagged this earlier and it hasn't been addressed: ${repeated.title}.`;
}

function buildLeaveAsIsRecommendation(state: FullSiteState): PrescriptiveRecommendation {
  const home = state.pages.find((page) => page.pageId === "home");
  const hero = home?.sections.find((section) => section.sectionId.startsWith("hero") && section.content);
  const target = hero ? "the homepage hero" : state.themeId ? "the current theme" : "the core structure";
  return {
    recommendationId: "leaveAsIs",
    key: `leaveAsIs:${target.replace(/\s+/g, "_")}`,
    phase: "none",
    title: target,
    rationale: "It already supports the site's primary intent without introducing friction.",
    impactSummary: "Preserves a strong element that is working.",
    context: `The current ${target} is consistent with your stated purpose.`,
    criteriaText: {
      impact: "Keeping this element avoids unnecessary churn.",
      alignment: "It aligns with the site purpose and audience expectations.",
      confidence: "This is based on the current structure and content.",
      disruption: "No changes required.",
    },
    scores: scoreRecommendation({ impact: 0, alignment: 0, confidence: 0, disruption: 0 }),
    tool: null,
    args: {},
    tradeoffs: ["No change means no new upside from experimentation."],
    whyNotAlternatives: [],
    requiresConfirmation: true,
  };
}

function generatePrescriptiveRecommendations(params: {
  snapshot: SiteSnapshot;
  fullState: FullSiteState;
  context: ContractContext;
  voice: VoiceContract;
  history: Map<string, { accepted: number; rejected: number; deferred: number; proposed: number }>;
  themeLocked: boolean;
}): PrescriptiveRecommendation[] {
  const { snapshot, fullState, context, voice, history, themeLocked } = params;
  const recommendations: PrescriptiveRecommendation[] = [];
  const voiceComplete = isVoiceComplete(voice);

  const homeSnapshot = snapshot.pages.find((page) => page.pageId === "home");
  const homeState = fullState.pages.find((page) => page.pageId === "home");

  if (homeSnapshot) {
    const sectionIds = homeSnapshot.sections.map((section) => section.sectionId);
    const ctaIndex = sectionIds.indexOf("ctaPrimary");
    const proofIndices = sectionIds
      .map((sectionId, index) => ({ sectionId, index }))
      .filter((item) => PROOF_SECTIONS.has(item.sectionId));
    const proofAfter = proofIndices.filter((item) => ctaIndex !== -1 && item.index > ctaIndex);

    if (ctaIndex !== -1 && proofAfter.length > 0) {
      const key = "moveProofAboveCTA:home";
      if (isEligibleRecommendation(history, key)) {
        const before = sectionIds.slice(0, ctaIndex);
        const after = sectionIds.slice(ctaIndex + 1);
        const proofMoved = after.filter((id) => PROOF_SECTIONS.has(id));
        const afterRemainder = after.filter((id) => !PROOF_SECTIONS.has(id));
        const orderedSectionIds = [...before, ...proofMoved, ...afterRemainder, "ctaPrimary"];
        const misaligned = !["credibility", "conversion", "trust"].includes(homeSnapshot.goal);
        const scores = scoreRecommendation({
          impact: 5,
          alignment: 4,
          confidence: 5,
          disruption: 3,
          misaligned,
        });
        recommendations.push({
          recommendationId: "moveProofAboveCTA",
          key,
          phase: "structure",
          title: "Move proof above the primary CTA on the homepage.",
          rationale: "Right now the CTA arrives before credibility signals.",
          impactSummary: "This earns trust before asking for action.",
          context:
            "On the homepage, credibility appears after the primary CTA, which can feel premature for first-time visitors.",
          criteriaText: {
            impact: "This removes a credibility blocker for the homepage goal.",
            alignment: "It aligns with building trust before conversion.",
            confidence: "Based on section ordering rules.",
            disruption: "Reorders one block without changing content.",
          },
          scores,
          tool: "reorderSections",
          args: { pageId: "home", orderedSectionIds },
          tradeoffs: ["CTA appears later, which can slow action for returning visitors."],
          whyNotAlternatives: [],
          requiresConfirmation: true,
        });
      }
    }

    const hasProof = proofIndices.length > 0;
    if (!hasProof) {
      const key = "addMissingProof:home";
      if (isEligibleRecommendation(history, key)) {
        const misaligned = homeSnapshot.goal === "navigation";
        const scores = scoreRecommendation({
          impact: 4,
          alignment: 4,
          confidence: 4,
          disruption: 2,
          misaligned,
        });
        recommendations.push({
          recommendationId: "addMissingProof",
          key,
          phase: "structure",
          title: "Add a proof block to the homepage.",
          rationale: "There are no credibility signals yet.",
          impactSummary: "Adds trust before asking visitors to act.",
          context: "The homepage currently lacks proof elements that validate the offering.",
          criteriaText: {
            impact: "Adds a missing credibility layer.",
            alignment: "Matches the need for trust on the homepage.",
            confidence: "Based on missing proof sections.",
            disruption: "Adds a single section.",
          },
          scores,
          tool: "addSection",
          args: { pageId: "home", sectionId: "proofMetrics" },
          tradeoffs: ["Adds page length and one more section to maintain."],
          whyNotAlternatives: [],
          requiresConfirmation: true,
        });
      }
    }
  }

  if (homeSnapshot && homeState && voiceComplete) {
    const heroSnapshot = homeSnapshot.sections.find((section) => section.sectionId.startsWith("hero"));
    const heroState = homeState.sections.find((section) => section.sectionId.startsWith("hero"));
    const headline =
      heroState && heroState.content && typeof (heroState.content as Record<string, unknown>).headline === "string"
        ? ((heroState.content as Record<string, unknown>).headline as string)
        : null;
    if (heroSnapshot && headline && countWords(headline) > 12) {
      const key = `strengthenHeroClarity:${heroSnapshot.sectionInstanceId}`;
      if (isEligibleRecommendation(history, key)) {
        const scores = scoreRecommendation({
          impact: 3,
          alignment: 4,
          confidence: 3,
          disruption: 1,
        });
        recommendations.push({
          recommendationId: "strengthenHeroClarity",
          key,
          phase: "content",
          title: "Tighten the homepage hero headline for clarity.",
          rationale: "The headline is long and dilutes the main point.",
          impactSummary: "Sharper framing improves first-glance comprehension.",
          context: "Your homepage hero headline is lengthy and could be clearer at a glance.",
          criteriaText: {
            impact: "Improves the clarity of the primary message.",
            alignment: "Fits the site goal and audience expectations.",
            confidence: "Based on headline length.",
            disruption: "Copy-only change.",
          },
          scores,
          tool: "rewriteSectionContent",
          args: {
            sectionInstanceId: heroSnapshot.sectionInstanceId,
            instruction: "Shorten the headline for clarity and focus.",
          },
          tradeoffs: ["Shorter copy can reduce nuance if over-tightened."],
          whyNotAlternatives: [],
          requiresConfirmation: true,
        });
      }
    }
  }

  if (voiceComplete) {
    let densestSection: {
      sectionInstanceId: string;
      pageId: PageId;
      sectionId: SectionId;
      wordCount: number;
    } | null = null;
    for (const page of fullState.pages) {
      for (const section of page.sections) {
        if (!section.content) continue;
        const strings = collectContentStrings(section.content);
        const wordCount = strings.reduce((sum, text) => sum + countWords(text), 0);
        if (wordCount > 120 && (!densestSection || wordCount > densestSection.wordCount)) {
          const snapshotSection = snapshot.pages
            .find((snapPage) => snapPage.pageId === page.pageId)
            ?.sections.find((snapSection) => snapSection.sectionId === section.sectionId);
          if (!snapshotSection) continue;
          densestSection = {
            sectionInstanceId: snapshotSection.sectionInstanceId,
            pageId: page.pageId,
            sectionId: section.sectionId,
            wordCount,
          };
        }
      }
    }

    if (densestSection) {
      const key = `reduceContentDensity:${densestSection.sectionInstanceId}`;
      if (isEligibleRecommendation(history, key)) {
        const scores = scoreRecommendation({
          impact: 2,
          alignment: 3,
          confidence: 2,
          disruption: 1,
        });
        recommendations.push({
          recommendationId: "reduceContentDensity",
          key,
          phase: "content",
          title: `Reduce content density in ${densestSection.pageId} ${densestSection.sectionId}.`,
          rationale: "The section is text-heavy for its role.",
          impactSummary: "Improves scanability and pacing.",
          context: `The ${densestSection.sectionId} section carries dense copy compared to the rest of the page.`,
          criteriaText: {
            impact: "Improves readability and pacing.",
            alignment: "Supports clearer communication for the audience.",
            confidence: "Based on content length.",
            disruption: "Copy-only change.",
          },
          scores,
          tool: "rewriteSectionContent",
          args: {
            sectionInstanceId: densestSection.sectionInstanceId,
            instruction: "Tighten the copy to reduce density while preserving meaning.",
          },
          tradeoffs: ["Condensing text may remove nuance if over-edited."],
          whyNotAlternatives: [],
          requiresConfirmation: true,
        });
      }
    }
  }

  if (!themeLocked) {
    const suggestedTheme = suggestTheme(context, voice);
    if (!fullState.themeId || fullState.themeId !== suggestedTheme) {
      const key = `alignThemeToPurpose:${suggestedTheme}`;
      if (isEligibleRecommendation(history, key)) {
        const scores = scoreRecommendation({
          impact: 2,
          alignment: 4,
          confidence: 3,
          disruption: 1,
        });
        recommendations.push({
          recommendationId: "alignThemeToPurpose",
          key,
          phase: "presentation",
          title: `Align the theme to ${THEME_REGISTRY[suggestedTheme].label}.`,
          rationale: "The current theme doesn't match the intended tone.",
          impactSummary: "Aligns visual tone with the site's purpose.",
          context: "The current theme can be better aligned with your purpose and audience.",
          criteriaText: {
            impact: "Improves visual alignment with intent.",
            alignment: "Matches the chosen purpose and tone.",
            confidence: "Based on theme intent mapping.",
            disruption: "Theme swap only.",
          },
          scores,
          tool: "applyTheme",
          args: { themeId: suggestedTheme },
          tradeoffs: ["A theme change can shift expectations for returning visitors."],
          whyNotAlternatives: [],
          requiresConfirmation: true,
        });
      }
    }
  }

  const caseGrid = fullState.pages
    .flatMap((page) => page.sections.map((section) => ({ pageId: page.pageId, section })))
    .find((item) => item.section.sectionId === "caseGrid" && item.section.content);
  if (caseGrid) {
    const items = (caseGrid.section.content as Record<string, unknown>).items;
    const itemCount = Array.isArray(items) ? items.length : 0;
    const snapshotSection = snapshot.pages
      .find((page) => page.pageId === caseGrid.pageId)
      ?.sections.find((section) => section.sectionId === "caseGrid");
    if (snapshotSection && itemCount > 0 && itemCount <= 3) {
      const currentVariant = snapshotSection.variantId ?? getDefaultVariant("caseGrid");
      if (currentVariant !== "twoColumn") {
        const key = `switchSectionVariantForFocus:${snapshotSection.sectionInstanceId}`;
        if (isEligibleRecommendation(history, key)) {
          const scores = scoreRecommendation({
            impact: 3,
            alignment: 3,
            confidence: 3,
            disruption: 1,
          });
          recommendations.push({
            recommendationId: "switchSectionVariantForFocus",
            key,
            phase: "presentation",
            title: "Switch the case grid to a two-column layout.",
            rationale: "Fewer items benefit from larger tiles and focus.",
            impactSummary: "Improves emphasis on each case study.",
            context: "The case grid has few items, which can feel cramped in three columns.",
            criteriaText: {
              impact: "Improves focus and scanability.",
              alignment: "Fits the work/credibility goal.",
              confidence: "Based on the item count.",
              disruption: "Layout-only change.",
            },
            scores,
            tool: "switchSectionVariant",
            args: { sectionInstanceId: snapshotSection.sectionInstanceId, variantId: "twoColumn" },
            tradeoffs: ["Larger tiles reduce above-the-fold density."],
            whyNotAlternatives: [],
            requiresConfirmation: true,
          });
        }
      }
    }
  }

  const eligible = recommendations
    .filter((rec) => rec.scores.score >= 3)
    .sort((a, b) => b.scores.score - a.scores.score);

  if (eligible.length === 0) {
    return [];
  }

  const maxTotal = 3;
  const maxActionable = Math.min(getAudienceRecommendationLimit(voice), maxTotal - 1);
  const topRecs = eligible.slice(0, maxActionable);

  for (const rec of topRecs) {
    const alternatives = topRecs
      .filter((item) => item.recommendationId !== rec.recommendationId)
      .slice(0, 2)
      .map((item) => `I did not recommend "${item.title}" because it scored lower on impact/confidence.`);
    rec.whyNotAlternatives = alternatives;
  }

  const leaveAsIs = buildLeaveAsIsRecommendation(fullState);
  return [...topRecs, leaveAsIs];
}

async function logMutation(params: {
  siteId: string;
  tool: string;
  args: Record<string, unknown>;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  conversationId?: string | null;
}) {
  await prisma.mutationLog.create({
    data: {
      siteId: params.siteId,
      tool: params.tool,
      arguments: toJson(params.args),
      beforeSnapshot: toJson(params.before ?? {}),
      afterSnapshot: toJson(params.after ?? {}),
      conversationId: params.conversationId ?? null,
    },
  });
}

function validatePagePlan(pageId: PageId, goal: PageGoal, sections: SectionId[], context: ContractContext) {
  const plan = {
    pages: {
      [pageId]: {
        goal,
        sections,
      },
    },
  };
  return validateSitePlan(plan, context);
}

async function createSiteFromPlanTool(params: {
  siteId: string;
  plan: SitePlan;
  context: ContractContext;
  conversationId?: string | null;
  ownerId?: string | null;
}) {
  const validation = validateSitePlan(params.plan, params.context);
  if (!validation.ok) {
    throw new Error("Plan validation failed");
  }

  const existing = await prisma.site.findUnique({ where: { id: params.siteId } });
  if (existing && params.ownerId && !existing.ownerId) {
    await prisma.site.update({
      where: { id: params.siteId },
      data: { ownerId: params.ownerId },
    });
  }
  if (existing) {
    const existingPages = await prisma.page.count({ where: { siteId: params.siteId } });
    if (existingPages > 0) {
      throw new Error("Site already initialized");
    }
  }

  const before = await getSiteSnapshot(params.siteId);
  const pagesToCreate = PAGE_IDS.filter((pageId) => params.plan.pages[pageId]);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (!existing) {
      await tx.site.create({
        data: {
          id: params.siteId,
          createdAt: now,
          updatedAt: now,
          ownerId: params.ownerId ?? undefined,
        },
      });
    }

    for (const [position, pageId] of pagesToCreate.entries()) {
      const page = params.plan.pages[pageId];
      if (!page) continue;
      const createdPage = await tx.page.create({
        data: {
          siteId: params.siteId,
          pageId,
          goal: page.goal,
          position,
        },
      });

      const sections = page.sections.map((sectionId, index) => ({
        pageId: createdPage.id,
        sectionId,
        position: index,
        variantId: getDefaultVariant(sectionId),
      }));

      if (sections.length > 0) {
        await tx.section.createMany({ data: sections });
      }
    }
  });

  const after = await getSiteSnapshot(params.siteId);
  await logMutation({
    siteId: params.siteId,
    tool: "createSiteFromPlan",
    args: { siteId: params.siteId, plan: params.plan },
    before,
    after,
    conversationId: params.conversationId,
  });

  return {
    pagesCreated: pagesToCreate,
    siteId: params.siteId,
    snapshot: after,
  };
}

async function addPageTool(params: {
  siteId: string;
  pageId: PageId;
  goal: PageGoal;
  sections: SectionId[];
  context: ContractContext;
  conversationId?: string | null;
}) {
  const validation = validatePagePlan(params.pageId, params.goal, params.sections, params.context);
  if (!validation.ok) {
    throw new Error("Page validation failed");
  }

  const site = await prisma.site.findUnique({
    where: { id: params.siteId },
    include: { pages: true },
  });
  if (!site) throw new Error("Site not found");

  const existingPage = site.pages.find((page) => page.pageId === params.pageId);
  if (existingPage) throw new Error("Page already exists");

  const before = await getSiteSnapshot(params.siteId);
  const position = site.pages.length;

  await prisma.$transaction(async (tx) => {
    const createdPage = await tx.page.create({
      data: {
        siteId: params.siteId,
        pageId: params.pageId,
        goal: params.goal,
        position,
      },
    });

    const sections = params.sections.map((sectionId, index) => ({
      pageId: createdPage.id,
      sectionId,
      position: index,
      variantId: getDefaultVariant(sectionId),
    }));
    if (sections.length > 0) {
      await tx.section.createMany({ data: sections });
    }
  });

  const after = await getSiteSnapshot(params.siteId);
  await logMutation({
    siteId: params.siteId,
    tool: "addPage",
    args: {
      siteId: params.siteId,
      pageId: params.pageId,
      goal: params.goal,
      sections: params.sections,
    },
    before,
    after,
    conversationId: params.conversationId,
  });

  return { pageId: params.pageId, siteId: params.siteId };
}

async function addSectionTool(params: {
  siteId: string;
  pageId: PageId;
  sectionId: SectionId;
  position?: number;
  context: ContractContext;
  conversationId?: string | null;
}) {
  const site = await prisma.site.findUnique({
    where: { id: params.siteId },
    include: { pages: { include: { sections: true } } },
  });
  if (!site) throw new Error("Site not found");

  const page = site.pages.find((p) => p.pageId === params.pageId);
  if (!page) throw new Error("Page not found");

  const existingSections = page.sections
    .sort((a, b) => a.position - b.position)
    .map((section) => section.sectionId as SectionId);
  const variantBySection = new Map(
    page.sections.map((section) => [
      section.sectionId as SectionId,
      section.variantId ?? getDefaultVariant(section.sectionId as SectionId),
    ]),
  );

  if (existingSections.includes(params.sectionId)) {
    throw new Error("Section already exists");
  }

  let insertPosition = params.position ?? existingSections.length;
  if (params.position === undefined) {
    const ctaIndex = existingSections.indexOf("ctaPrimary");
    if (ctaIndex !== -1) {
      insertPosition = ctaIndex;
    }
  }

  if (params.sectionId.startsWith("hero")) {
    insertPosition = 0;
  }

  const nextSections = [...existingSections];
  nextSections.splice(insertPosition, 0, params.sectionId);

  const validation = validatePagePlan(params.pageId, page.goal as PageGoal, nextSections, params.context);
  if (!validation.ok) {
    throw new Error("Section ordering invalid");
  }

  const before = await getSiteSnapshot(params.siteId);

  await prisma.$transaction(async (tx) => {
    const updatedSections = nextSections.map((sectionId, index) => ({
      pageId: page.id,
      sectionId,
      position: index,
      variantId: variantBySection.get(sectionId) ?? getDefaultVariant(sectionId),
    }));

    await tx.section.deleteMany({ where: { pageId: page.id } });
    await tx.section.createMany({ data: updatedSections });
  });

  const after = await getSiteSnapshot(params.siteId);
  await logMutation({
    siteId: params.siteId,
    tool: "addSection",
    args: {
      siteId: params.siteId,
      pageId: params.pageId,
      sectionId: params.sectionId,
      position: params.position ?? null,
    },
    before,
    after,
    conversationId: params.conversationId,
  });

  return { sectionId: params.sectionId, pageId: params.pageId, siteId: params.siteId };
}

async function reorderSectionsTool(params: {
  siteId: string;
  pageId: PageId;
  orderedSectionIds: SectionId[];
  context: ContractContext;
  conversationId?: string | null;
}) {
  const site = await prisma.site.findUnique({
    where: { id: params.siteId },
    include: { pages: { include: { sections: true } } },
  });
  if (!site) throw new Error("Site not found");

  const page = site.pages.find((p) => p.pageId === params.pageId);
  if (!page) throw new Error("Page not found");

  const existingSections = page.sections.map((section) => section.sectionId as SectionId);
  const ordered = params.orderedSectionIds;

  if (new Set(ordered).size !== ordered.length) throw new Error("Duplicate sections");
  if (ordered.length !== existingSections.length) throw new Error("Section count mismatch");

  const missing = existingSections.filter((section) => !ordered.includes(section));
  if (missing.length > 0) throw new Error("Missing sections");

  const validation = validatePagePlan(params.pageId, page.goal as PageGoal, ordered, params.context);
  if (!validation.ok) {
    throw new Error("Section ordering invalid");
  }

  const before = await getSiteSnapshot(params.siteId);

  await prisma.$transaction(async (tx) => {
    for (const [index, sectionId] of ordered.entries()) {
      await tx.section.update({
        where: {
          pageId_sectionId: {
            pageId: page.id,
            sectionId,
          },
        },
        data: { position: index },
      });
    }
  });

  const after = await getSiteSnapshot(params.siteId);
  await logMutation({
    siteId: params.siteId,
    tool: "reorderSections",
    args: {
      siteId: params.siteId,
      pageId: params.pageId,
      orderedSectionIds: params.orderedSectionIds,
    },
    before,
    after,
    conversationId: params.conversationId,
  });

  return { success: true, pageId: params.pageId, siteId: params.siteId };
}

async function enableBlogTool(params: {
  siteId: string;
  context: ContractContext;
  conversationId?: string | null;
}) {
  if (params.context.blog === "no") throw new Error("Blog not allowed");

  return addPageTool({
    siteId: params.siteId,
    pageId: "blog",
    goal: CANONICAL_BLOG_PAGE.goal,
    sections: CANONICAL_BLOG_PAGE.sections,
    context: params.context,
    conversationId: params.conversationId,
  });
}

async function createPreviewTool(params: {
  siteId: string;
  label?: string;
  conversationId?: string | null;
}) {
  const site = await prisma.site.findUnique({ where: { id: params.siteId } });
  if (!site) throw new Error("Site not found");

  const snapshotData = await getFullSiteState(params.siteId);
  if (!snapshotData) throw new Error("Unable to capture snapshot");

  const snapshot = await prisma.snapshot.create({
    data: {
      siteId: params.siteId,
      state: "preview",
      label: params.label ?? null,
      data: toJson(snapshotData),
    },
  });

  const nextReleaseState = (site.releaseState as ReleaseState) === "published" ? "published" : "preview";
  await prisma.site.update({
    where: { id: params.siteId },
    data: { releaseState: nextReleaseState },
  });

  const previewUrl = buildPreviewUrl(snapshot.id);
  await logMutation({
    siteId: params.siteId,
    tool: "createPreview",
    args: { siteId: params.siteId, snapshotId: snapshot.id, label: params.label ?? null, previewUrl },
    before: {
      releaseState: (site.releaseState as ReleaseState) ?? "draft",
      publishedSnapshotId: site.publishedSnapshotId ?? null,
    },
    after: {
      releaseState: nextReleaseState,
      publishedSnapshotId: site.publishedSnapshotId ?? null,
    },
    conversationId: params.conversationId ?? null,
  });

  return { previewUrl, snapshotId: snapshot.id };
}

async function publishSnapshotTool(params: {
  siteId: string;
  snapshotId: string;
  conversationId?: string | null;
}) {
  const site = await prisma.site.findUnique({ where: { id: params.siteId } });
  if (!site) throw new Error("Site not found");

  const sourceSnapshot = await prisma.snapshot.findUnique({
    where: { id: params.snapshotId },
  });
  if (!sourceSnapshot || sourceSnapshot.siteId !== params.siteId) {
    throw new Error("Snapshot not found");
  }

  const publishedSnapshot = await prisma.snapshot.create({
    data: {
      siteId: params.siteId,
      state: "published",
      label: sourceSnapshot.label ?? null,
      data: toJson(sourceSnapshot.data),
    },
  });

  await prisma.site.update({
    where: { id: params.siteId },
    data: {
      releaseState: "published",
      publishedSnapshotId: publishedSnapshot.id,
    },
  });

  await logMutation({
    siteId: params.siteId,
    tool: "publishSnapshot",
    args: {
      siteId: params.siteId,
      snapshotId: params.snapshotId,
      publishedSnapshotId: publishedSnapshot.id,
    },
    before: {
      releaseState: (site.releaseState as ReleaseState) ?? "draft",
      publishedSnapshotId: site.publishedSnapshotId ?? null,
    },
    after: {
      releaseState: "published",
      publishedSnapshotId: publishedSnapshot.id,
    },
    conversationId: params.conversationId ?? null,
  });

  return { publishedAt: publishedSnapshot.createdAt, snapshotId: publishedSnapshot.id };
}

async function rollbackToSnapshotTool(params: {
  siteId: string;
  snapshotId: string;
  conversationId?: string | null;
}) {
  const site = await prisma.site.findUnique({ where: { id: params.siteId } });
  if (!site) throw new Error("Site not found");

  const snapshot = await prisma.snapshot.findUnique({
    where: { id: params.snapshotId },
  });
  if (!snapshot || snapshot.siteId !== params.siteId) {
    throw new Error("Snapshot not found");
  }
  if (snapshot.state !== "published") {
    throw new Error("Snapshot not published");
  }

  await prisma.site.update({
    where: { id: params.siteId },
    data: {
      releaseState: "published",
      publishedSnapshotId: snapshot.id,
    },
  });

  await logMutation({
    siteId: params.siteId,
    tool: "rollbackToSnapshot",
    args: {
      siteId: params.siteId,
      snapshotId: params.snapshotId,
      previousPublishedSnapshotId: site.publishedSnapshotId ?? null,
    },
    before: {
      releaseState: (site.releaseState as ReleaseState) ?? "draft",
      publishedSnapshotId: site.publishedSnapshotId ?? null,
    },
    after: {
      releaseState: "published",
      publishedSnapshotId: snapshot.id,
    },
    conversationId: params.conversationId ?? null,
  });

  return { state: "published", snapshotId: snapshot.id };
}

async function applyThemeTool(params: {
  siteId: string;
  themeId: ThemeId;
  conversationId?: string | null;
}) {
  if (!THEME_REGISTRY[params.themeId]) throw new Error("Invalid theme");

  const before = await getSiteSnapshot(params.siteId);
  await prisma.site.update({
    where: { id: params.siteId },
    data: { themeId: params.themeId },
  });
  const after = await getSiteSnapshot(params.siteId);

  await logMutation({
    siteId: params.siteId,
    tool: "applyTheme",
    args: { siteId: params.siteId, themeId: params.themeId },
    before,
    after,
    conversationId: params.conversationId,
  });

  return { themeId: params.themeId };
}

async function switchSectionVariantTool(params: {
  siteId: string;
  sectionInstanceId: string;
  variantId: string;
  conversationId?: string | null;
}) {
  const section = await prisma.section.findUnique({
    where: { id: params.sectionInstanceId },
  });
  if (!section) throw new Error("Section not found");

  const sectionId = section.sectionId as SectionId;
  if (!isAllowedVariant(sectionId, params.variantId)) {
    throw new Error("Variant not allowed");
  }

  const before = await getSiteSnapshot(params.siteId);
  await prisma.section.update({
    where: { id: params.sectionInstanceId },
    data: { variantId: params.variantId },
  });
  const after = await getSiteSnapshot(params.siteId);

  await logMutation({
    siteId: params.siteId,
    tool: "switchSectionVariant",
    args: {
      siteId: params.siteId,
      sectionInstanceId: params.sectionInstanceId,
      variantId: params.variantId,
    },
    before,
    after,
    conversationId: params.conversationId,
  });

  return { sectionInstanceId: params.sectionInstanceId, variantId: params.variantId };
}

async function inferToolCall(
  openai: OpenAI,
  message: string,
  siteSnapshot: SiteSnapshot,
  context: ContractContext,
) {
  const schema = {
    tool: "addPage | addSection | reorderSections | enableBlog | none",
    arguments: "object",
  };

  const prompt =
    "You are an operator router. Output JSON only. Choose a single tool and arguments. " +
    "If the user request is not a valid structural change, respond with {\"tool\":\"none\",\"arguments\":{}}.\n" +
    `Schema: ${JSON.stringify(schema)}\n` +
    `Allowed pages: ${PAGE_IDS.join(", ")}\n` +
    `Allowed goals: ${PAGE_GOALS.join(", ")}\n` +
    `Allowed sections: ${SECTION_IDS.join(", ")}\n` +
    `Allowed sections per page: ${JSON.stringify(ALLOWED_SECTIONS)}\n` +
    "Ordering rules: hero first and only one, ctaPrimary last if present, no duplicates, blog sections only on blog.\n" +
    `Contract: ${JSON.stringify(context)}\n` +
    `Current site: ${JSON.stringify(siteSnapshot)}\n` +
    `User request: ${message}\n`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    temperature: 0,
    input: [inputText("system", prompt)],
  });

  const output = extractOutputText(response);
  if (!output) return { tool: "none", arguments: {} };

  const jsonText = extractJsonFromText(output);
  if (!jsonText) return { tool: "none", arguments: {} };

  try {
    return JSON.parse(jsonText);
  } catch {
    return { tool: "none", arguments: {} };
  }
}

async function inferContentToolCall(
  openai: OpenAI,
  message: string,
  siteSnapshot: SiteSnapshot,
  voice: VoiceContract,
) {
  const sections = siteSnapshot.pages.flatMap((page) =>
    page.sections.map((section) => ({
      sectionInstanceId: section.sectionInstanceId,
      pageId: page.pageId,
      sectionId: section.sectionId,
      hasContent: section.hasContent,
    })),
  );

  const prompt =
    "You are a content router. Output JSON only.\n" +
    'Choose a single tool: "generateSectionContent", "rewriteSectionContent", or "none".\n' +
    "If the user request is ambiguous or does not name a section, return none.\n" +
    "Schema examples:\n" +
    '{"tool":"generateSectionContent","arguments":{"pageId":"home","sectionInstanceId":"..."} }\n' +
    '{"tool":"rewriteSectionContent","arguments":{"sectionInstanceId":"...","instruction":"..."} }\n' +
    '{"tool":"none","arguments":{}}\n' +
    `Voice: ${JSON.stringify(voice)}\n` +
    `Sections: ${JSON.stringify(sections)}\n` +
    `User request: ${message}\n`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    temperature: 0,
    input: [inputText("system", prompt)],
  });

  const output = extractOutputText(response);
  if (!output) return { tool: "none", arguments: {} };

  const jsonText = extractJsonFromText(output);
  if (!jsonText) return { tool: "none", arguments: {} };

  try {
    return JSON.parse(jsonText);
  } catch {
    return { tool: "none", arguments: {} };
  }
}

async function inferPresentationToolCall(
  openai: OpenAI,
  message: string,
  siteSnapshot: SiteSnapshot,
  context: ContractContext,
  voice: VoiceContract,
) {
  const sections = siteSnapshot.pages.flatMap((page) =>
    page.sections.map((section) => ({
      sectionInstanceId: section.sectionInstanceId,
      pageId: page.pageId,
      sectionId: section.sectionId,
      variantId: section.variantId,
      allowedVariants: SECTION_VARIANTS[section.sectionId].variants,
    })),
  );

  const prompt =
    "You are a presentation router. Output JSON only.\n" +
    'Choose a single tool: "applyTheme", "switchSectionVariant", or "none".\n' +
    "If the user request is ambiguous or violates constraints, return none.\n" +
    "Include a short reason field explaining why the choice fits.\n" +
    "Schema examples:\n" +
    '{"tool":"applyTheme","arguments":{"themeId":"editorialDark"},"reason":"..."}\n' +
    '{"tool":"switchSectionVariant","arguments":{"sectionInstanceId":"...","variantId":"twoColumn"},"reason":"..."}\n' +
    '{"tool":"none","arguments":{}}\n' +
    `Allowed themes: ${JSON.stringify(THEME_REGISTRY)}\n` +
    `Contract: ${JSON.stringify(context)}\n` +
    `Voice: ${JSON.stringify(voice)}\n` +
    `Sections: ${JSON.stringify(sections)}\n` +
    `User request: ${message}\n`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    temperature: 0,
    input: [inputText("system", prompt)],
  });

  const output = extractOutputText(response);
  if (!output) return { tool: "none", arguments: {}, reason: "" };

  const jsonText = extractJsonFromText(output);
  if (!jsonText) return { tool: "none", arguments: {}, reason: "" };

  try {
    const parsed = JSON.parse(jsonText) as {
      tool?: string;
      arguments?: Record<string, unknown>;
      reason?: string;
    };
    return parsed;
  } catch {
    return { tool: "none", arguments: {}, reason: "" };
  }
}

async function inferReleaseToolCall(
  openai: OpenAI,
  message: string,
  releaseState: ReleaseState,
  publishedSnapshotId: string | null,
  snapshots: ReleaseSnapshotInfo[],
) {
  const prompt =
    "You are a release router. Output JSON only.\n" +
    'Choose a single tool: "createPreview", "publishSnapshot", "rollbackToSnapshot", or "none".\n' +
    "If the user request is ambiguous or violates constraints, return none.\n" +
    "Include a short reason field explaining the choice.\n" +
    "Guidance: use createPreview for preview/share requests. For publish requests, select the latest preview snapshot if one exists. " +
    "For rollback, select the most recent published snapshot that is not the currently published snapshot if possible.\n" +
    "Schema examples:\n" +
    '{"tool":"createPreview","arguments":{"label":"Client review"},"reason":"..."}\n' +
    '{"tool":"publishSnapshot","arguments":{"snapshotId":"..."},"reason":"..."}\n' +
    '{"tool":"rollbackToSnapshot","arguments":{"snapshotId":"..."},"reason":"..."}\n' +
    '{"tool":"none","arguments":{}}\n' +
    `Release state: ${releaseState}\n` +
    `Published snapshot: ${publishedSnapshotId ?? "none"}\n` +
    `Snapshots: ${JSON.stringify(snapshots)}\n` +
    `User request: ${message}\n`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    temperature: 0,
    input: [inputText("system", prompt)],
  });

  const output = extractOutputText(response);
  if (!output) return { tool: "none", arguments: {}, reason: "" };

  const jsonText = extractJsonFromText(output);
  if (!jsonText) return { tool: "none", arguments: {}, reason: "" };

  try {
    const parsed = JSON.parse(jsonText) as {
      tool?: string;
      arguments?: Record<string, unknown>;
      reason?: string;
    };
    return parsed;
  } catch {
    return { tool: "none", arguments: {}, reason: "" };
  }
}

async function generateSectionContentTool(params: {
  siteId: string;
  pageId: PageId;
  sectionInstanceId: string;
  voice: VoiceContract;
  context: ContractContext;
  conversationId?: string | null;
}) {
  const page = await prisma.page.findFirst({
    where: { siteId: params.siteId, pageId: params.pageId },
    include: { sections: true },
  });
  if (!page) throw new Error("Page not found");

  const section = page.sections.find((item) => item.id === params.sectionInstanceId);
  if (!section) throw new Error("Section not found");

  const sectionId = section.sectionId as SectionId;
  const schemaSnippet = CONTENT_SCHEMA_SNIPPETS[sectionId];
  if (!schemaSnippet) throw new Error("Missing schema");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const facts = await loadSiteFacts(params.siteId);
  let lastError = "Unknown error";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt =
      "You are writing content for a single section. Output JSON only.\n" +
      `Section type: ${sectionId}\n` +
      `Page goal: ${page.goal}\n` +
      `Contract: ${JSON.stringify(params.context)}\n` +
      `Known facts (use only if provided; do not invent): ${JSON.stringify(facts ?? {})}\n` +
      `Voice: ${JSON.stringify(params.voice)}\n` +
      `Schema: ${schemaSnippet}\n` +
      "Rules: plain text only, no HTML, no markdown, no emojis, no links.\n" +
      "If facts are missing, use placeholders that clearly ask for real data.\n" +
      `Banned words: ${BANNED_WORDS.join(", ")}\n` +
      "Avoid superlatives and empty intensifiers.\n";

    const input = [
      inputText("system", prompt),
      ...(attempt > 0
        ? [
            inputText(
              "system",
              "Your previous output violated the content schema or content policy. Regenerate using only allowed fields and plain text.",
            ),
          ]
        : []),
    ];

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: 0.4,
      input,
    });

    const output = extractOutputText(response);
    if (!output) {
      lastError = "No output";
      continue;
    }

    const jsonText = extractJsonFromText(output);
    if (!jsonText) {
      lastError = "No JSON detected";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      lastError = "Invalid JSON";
      continue;
    }

    const validation = validateSectionContent(sectionId, parsed);
    if (!validation.ok) {
      lastError = validation.errors.join("; ");
      continue;
    }

    return {
      sectionInstanceId: section.id,
      pageId: params.pageId,
      sectionId,
      content: validation.content,
    };
  }

  throw new Error(lastError);
}

async function rewriteSectionContentTool(params: {
  siteId: string;
  sectionInstanceId: string;
  instruction: string;
  voice: VoiceContract;
  context: ContractContext;
  baseContent?: unknown;
}) {
  const section = await prisma.section.findUnique({
    where: { id: params.sectionInstanceId },
    include: { Page: true },
  });

  if (!section) throw new Error("Section not found");

  const sectionId = section.sectionId as SectionId;
  const schemaSnippet = CONTENT_SCHEMA_SNIPPETS[sectionId];
  if (!schemaSnippet) throw new Error("Missing schema");

  const baseContent = params.baseContent ?? section.content;
  if (!baseContent) throw new Error("No existing content to rewrite");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const facts = await loadSiteFacts(params.siteId);
  let lastError = "Unknown error";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt =
      "You are rewriting content for a single section. Output JSON only.\n" +
      `Section type: ${sectionId}\n` +
      `Page goal: ${section.Page.goal}\n` +
      `Contract: ${JSON.stringify(params.context)}\n` +
      `Known facts (use only if provided; do not invent): ${JSON.stringify(facts ?? {})}\n` +
      `Voice: ${JSON.stringify(params.voice)}\n` +
      `Schema: ${schemaSnippet}\n` +
      `Instruction: ${params.instruction}\n` +
      `Current content: ${JSON.stringify(baseContent)}\n` +
      "Rules: plain text only, no HTML, no markdown, no emojis, no links.\n" +
      "If facts are missing, use placeholders that clearly ask for real data.\n" +
      `Banned words: ${BANNED_WORDS.join(", ")}\n` +
      "Avoid superlatives and empty intensifiers.\n";

    const input = [
      inputText("system", prompt),
      ...(attempt > 0
        ? [
            inputText(
              "system",
              "Your previous output violated the content schema or content policy. Regenerate using only allowed fields and plain text.",
            ),
          ]
        : []),
    ];

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: 0.4,
      input,
    });

    const output = extractOutputText(response);
    if (!output) {
      lastError = "No output";
      continue;
    }

    const jsonText = extractJsonFromText(output);
    if (!jsonText) {
      lastError = "No JSON detected";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      lastError = "Invalid JSON";
      continue;
    }

    const validation = validateSectionContent(sectionId, parsed);
    if (!validation.ok) {
      lastError = validation.errors.join("; ");
      continue;
    }

    return {
      sectionInstanceId: section.id,
      pageId: section.Page.pageId as PageId,
      sectionId,
      content: validation.content,
    };
  }

  throw new Error(lastError);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const auth = getOptionalAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });
  const authUserId = auth.session?.userId ?? null;

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { error: "Missing OPENAI_API_KEY" });
  }

  const prescriptivePreview = event.queryStringParameters?.prescriptivePreview === "true";

  let body: {
    message?: string;
    conversationId?: string;
    systemPrompt?: string;
    siteId?: string;
    stream?: boolean;
    scope?: unknown;
    pageId?: string;
    draftText?: string;
  } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return jsonResponse(400, { error: "message is required" });

  const prescriptive = (body as { prescriptive?: boolean }).prescriptive === true;
  const pageId = typeof body.pageId === "string" ? body.pageId : null;
  const stream = body.stream === true;

  if (prescriptive) {
    const siteId = typeof body.siteId === "string" && body.siteId.trim() ? body.siteId.trim() : null;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const siteContext = siteId
      ? await prisma.site.findUnique({
          where: { id: siteId },
          select: {
            purpose: true,
            audience: true,
            primaryConversion: true,
            toneAxis: true,
            blogEnabled: true,
          },
        })
      : null;
    const requestedConversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    let conversation =
      requestedConversationId && requestedConversationId.trim()
        ? await prisma.conversation.findUnique({ where: { id: requestedConversationId.trim() } })
        : null;
    if (!conversation && siteContext && siteId) {
      conversation = await prisma.conversation.findUnique({ where: { siteId } });
    }
    if (!conversation) {
      const conversationData: Record<string, unknown> = {};
      if (siteContext && siteId) conversationData.siteId = siteId;
      if (authUserId) conversationData.ownerId = authUserId;
      conversation = await prisma.conversation.create({
        data: conversationData,
      });
    } else if (authUserId && !conversation.ownerId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { ownerId: authUserId },
      });
    }
    const conversationId = conversation.id;

    const context: ContractContext = {
      purpose: siteContext?.purpose ?? null,
      audience: siteContext?.audience ?? null,
      action: siteContext?.primaryConversion ?? null,
      tone: siteContext?.toneAxis ?? null,
      blog:
        siteContext?.blogEnabled === null || siteContext?.blogEnabled === undefined
          ? null
          : siteContext.blogEnabled
            ? "yes"
            : "no",
    };

    try {
      const prescriptiveResponse = await generatePrescriptiveResponse({
        openai,
        message,
        siteId,
        pageId,
        context,
      });
      const prescriptiveMessages = buildPrescriptiveMessages(prescriptiveResponse);
      const memory = await loadPrescriptiveMemory(conversationId);
      const existing = new Map((memory?.recommendations ?? []).map((item) => [item.key, item]));
      const recommendations = prescriptiveResponse.recommendations ?? [];
      const repeated = recommendations
        .map((rec) => ({ rec, key: buildRecommendationKey(rec) }))
        .filter(({ key }) => existing.has(key));
      const reminder =
        repeated.length > 0 && memory?.lastReminderKey !== repeated[0].key
          ? {
              id: createMessageId(),
              role: "ai" as const,
              type: "insight" as const,
              title: "Reminder",
              content: `I flagged this earlier and it hasn't been addressed: ${repeated[0].rec.content}`,
              createdAt: Date.now(),
            }
          : null;
      const updatedMemory: PrescriptiveMemory = {
        recommendations: [
          ...existing.values(),
          ...recommendations
            .filter((rec) => !existing.has(buildRecommendationKey(rec)))
            .map((rec) => ({ key: buildRecommendationKey(rec), content: rec.content })),
        ],
        lastReminderKey: reminder ? repeated[0].key : memory?.lastReminderKey ?? null,
      };

      if (recommendations.length > 0) {
        await savePrescriptiveMemory(conversationId, updatedMemory);
      }

      const responseMessages = reminder ? [reminder, ...prescriptiveMessages] : prescriptiveMessages;
      return jsonResponse(200, {
        conversationId,
        siteId,
        prescriptive: prescriptiveResponse,
        messages: responseMessages,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Prescriptive engine failed";
      return jsonResponse(500, { error: errorMessage });
    }
  }

  const scope = body.scope as
    | {
        type?: string;
        pageId?: string;
        sectionId?: string;
        sectionInstanceId?: string;
      }
    | undefined;

  const requestedId = typeof body.conversationId === "string" ? body.conversationId : null;
  const extraSystemPrompt =
    typeof body.systemPrompt === "string" && body.systemPrompt.trim()
      ? body.systemPrompt.trim()
      : null;

  let conversation = requestedId
    ? await prisma.conversation.findUnique({ where: { id: requestedId } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: authUserId ? { ownerId: authUserId } : {},
    });
  } else if (authUserId && !conversation.ownerId) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { ownerId: authUserId },
    });
  }

  const conversationId = conversation.id;
  const requestedSiteId = typeof body.siteId === "string" && body.siteId.trim() ? body.siteId.trim() : null;
  let siteId: string | null = requestedSiteId ?? conversation.siteId ?? null;
  if (siteId && !conversation.siteId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { siteId },
    });
  }

  if (scope?.type === "section") {
    if (!siteId) {
      return jsonResponse(400, { error: "siteId is required for section edits." });
    }

    const sectionInstanceId =
      typeof scope.sectionInstanceId === "string" && scope.sectionInstanceId.trim()
        ? scope.sectionInstanceId.trim()
        : null;
    if (!sectionInstanceId) {
      return jsonResponse(400, { error: "sectionInstanceId is required for section edits." });
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionInstanceId },
      include: { Page: true },
    });

    if (!section || section.Page.siteId !== siteId) {
      return jsonResponse(404, { error: "Section not found for this site." });
    }

    if (scope.pageId && scope.pageId !== section.Page.pageId) {
      return jsonResponse(400, { error: "section pageId does not match." });
    }

    if (scope.sectionId && scope.sectionId !== section.sectionId) {
      return jsonResponse(400, { error: "sectionId does not match." });
    }

    let userMessage: { id: string } | null = null;
    if (message !== "APPLY_DRAFT") {
      userMessage = await prisma.message.create({
        data: {
          role: "user",
          mode: "builder",
          content: message,
          conversationId,
        },
      });
    }

    const fallbackContext = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        purpose: true,
        audience: true,
        primaryConversion: true,
        toneAxis: true,
        blogEnabled: true,
      },
    });

    const updatedContext = await loadContext(conversationId, {
      purpose: fallbackContext?.purpose ?? null,
      audience: fallbackContext?.audience ?? null,
      action: fallbackContext?.primaryConversion ?? null,
      tone: fallbackContext?.toneAxis ?? null,
      blog:
        fallbackContext?.blogEnabled === null || fallbackContext?.blogEnabled === undefined
          ? null
          : fallbackContext.blogEnabled
            ? "yes"
            : "no",
    });

    const voice = await loadVoiceContract(siteId);
    if (!isVoiceComplete(voice)) {
      return jsonResponse(400, { error: "Voice contract is required before editing section content." });
    }

    const sectionId = section.sectionId as SectionId;
    const schemaSnippet = CONTENT_SCHEMA_SNIPPETS[sectionId];
    if (!schemaSnippet) {
      return jsonResponse(400, { error: "Missing content schema for section." });
    }

    if (message === "APPLY_DRAFT") {
      const draftText = typeof body.draftText === "string" ? body.draftText.trim() : "";
      if (!draftText) {
        return jsonResponse(400, { error: "draftText is required to apply a draft." });
      }

      const jsonText = extractJsonFromText(draftText) ?? draftText;
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return jsonResponse(400, { error: "Draft is not valid JSON." });
      }

      const validation = validateSectionContent(sectionId, parsed);
      if (!validation.ok) {
        return jsonResponse(400, { error: validation.errors.join("; ") });
      }

      await prisma.section.update({
        where: { id: section.id },
        data: { content: toJson(validation.content) },
      });

      await recordContentHistory({
        siteId,
        sectionInstanceId: section.id,
        content: validation.content,
        status: "accepted",
        instruction: "APPLY_DRAFT",
        conversationId,
      });

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "builder",
          content: "Draft applied to the section.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        siteId,
        updatedSection: {
          sectionInstanceId: section.id,
          pageId: section.Page.pageId,
          sectionId: section.sectionId,
          content: validation.content,
        },
        assistantMessage,
      });
    }

    if (stream) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const encoder = new TextEncoder();
      const abortController = new AbortController();
      const facts = await loadSiteFacts(siteId);

      const prompt =
        (section.content
          ? "You are rewriting content for a single section. Output JSON only.\n"
          : "You are writing content for a single section. Output JSON only.\n") +
        `Section type: ${sectionId}\n` +
        `Page goal: ${section.Page.goal}\n` +
        `Contract: ${JSON.stringify(updatedContext)}\n` +
        `Known facts (use only if provided; do not invent): ${JSON.stringify(facts ?? {})}\n` +
        `Voice: ${JSON.stringify(voice)}\n` +
        `Schema: ${schemaSnippet}\n` +
        `User request: ${message}\n` +
        (section.content ? `Current content: ${JSON.stringify(section.content)}\n` : "") +
        "Rules: plain text only, no HTML, no markdown, no emojis, no links.\n" +
        "If facts are missing, use placeholders that clearly ask for real data.\n" +
        `Banned words: ${BANNED_WORDS.join(", ")}\n` +
        "Avoid superlatives and empty intensifiers.\n";

      const streamResponse = await openai.responses.stream(
        {
          model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
          temperature: 0.4,
          input: [inputText("system", prompt)],
        },
        { signal: abortController.signal },
      );

      let buffer = "";
      let emitted = new Set<string>();
      const fieldOrder = SECTION_FIELD_ORDER[sectionId] ?? [];

      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emitField = (path: string, value: unknown) => {
            const payload = `${JSON.stringify({ path, value })}\n`;
            controller.enqueue(encoder.encode(payload));
          };

          try {
            for await (const event of streamResponse) {
              if (event.type === "response.output_text.delta") {
                buffer += event.delta;
                const jsonText = extractJsonFromText(buffer);
                if (!jsonText) continue;
                let parsed: unknown;
                try {
                  parsed = JSON.parse(jsonText);
                } catch {
                  continue;
                }

                if (parsed && typeof parsed === "object") {
                  for (const pattern of fieldOrder) {
                    const paths = expandFieldPaths(parsed, pattern);
                    for (const { path, value } of paths) {
                      if (emitted.has(path)) continue;
                      emitField(path, value);
                      emitted.add(path);
                    }
                  }
                }
              }
            }

            // Ensure full payload is sent at the end in case late fields didn't stream.
            const jsonText = extractJsonFromText(buffer);
            if (jsonText) {
              try {
                const parsed = JSON.parse(jsonText) as Record<string, unknown>;
                emitField("__final__", parsed);
              } catch {
                // ignore parse failure
              }
            }

            controller.close();
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              controller.close();
              return;
            }
            controller.error(error);
          }
        },
        cancel() {
          abortController.abort();
        },
      });

      const headers: Record<string, string> = {
        ...streamHeadersBase,
        "x-conversation-id": conversationId,
        "x-site-id": siteId,
        "x-mode": "builder",
      };

      return new Response(readable, { headers });
    }

    let result:
      | { sectionInstanceId: string; pageId: PageId; sectionId: SectionId; content: unknown }
      | null = null;
    if (section.content) {
      result = await rewriteSectionContentTool({
        siteId,
        sectionInstanceId: section.id,
        instruction: message,
        voice,
        context: updatedContext,
        baseContent: section.content,
      });
    } else {
      result = await generateSectionContentTool({
        siteId,
        pageId: section.Page.pageId as PageId,
        sectionInstanceId: section.id,
        voice,
        context: updatedContext,
        conversationId,
      });
    }

    if (!result) {
      return jsonResponse(500, { error: "Unable to update section content." });
    }

    await prisma.section.update({
      where: { id: result.sectionInstanceId },
      data: { content: toJson(result.content) },
    });

    await recordContentHistory({
      siteId,
      sectionInstanceId: result.sectionInstanceId,
      content: result.content,
      status: "accepted",
      instruction: message,
      conversationId,
    });

    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "builder",
        content: "Section updated. Content is now applied.",
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      siteId,
      userMessage,
      updatedSection: {
        sectionInstanceId: result.sectionInstanceId,
        pageId: result.pageId,
        sectionId: result.sectionId,
        content: result.content,
      },
      assistantMessage,
    });
  }

  const lastAssistant = await prisma.message.findFirst({
    where: { conversationId, role: "assistant" },
    orderBy: { createdAt: "desc" },
  });

  const priorMessageCount = await prisma.message.count({
    where: { conversationId },
  });
  const isNewConversation = priorMessageCount === 0;

  const fallbackContext: ContractContext = {
    purpose: conversation.sitePurpose ?? null,
    audience: conversation.audience ?? null,
    action: conversation.primaryConversion ?? null,
    tone: conversation.toneAxis ?? null,
    blog:
      conversation.wantsBlog === null || conversation.wantsBlog === undefined
        ? null
        : conversation.wantsBlog
          ? "yes"
          : "no",
  };
  const existingContext = await loadContext(conversationId, fallbackContext);
  const wasComplete = getMissingFields(existingContext).length === 0;

  const { answers, structured } = extractClarificationAnswers(message);
  const effectiveAnswers = structured ? answers : {};
  const updatedContext: ContractContext = {
    purpose: effectiveAnswers.purpose ?? existingContext.purpose,
    audience: effectiveAnswers.audience ?? existingContext.audience,
    action: effectiveAnswers.action ?? existingContext.action,
    tone: effectiveAnswers.tone ?? existingContext.tone,
    blog: effectiveAnswers.blog ?? existingContext.blog,
  };

  const missingFields = getMissingFields(updatedContext);
  const isComplete = missingFields.length === 0;
  const justCompleted = !wasComplete && isComplete;

  if (structured && Object.keys(answers).length > 0) {
    await saveContext(conversationId, updatedContext);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const wantsBuild =
    detectBuildIntent(message) || (lastAssistant?.mode === "ready" && isAffirmative(message));
  const answeredClarifier = structured && lastAssistant?.mode === "clarifier";

  let effectiveMode: AssistantMode = "advisor";

  if (!isComplete && wantsBuild) {
    effectiveMode = "clarifier";
  }

  if (isComplete && wantsBuild) {
    effectiveMode = "builder";
  }

  if (isNewConversation && !wantsBuild) {
    effectiveMode = "advisor";
  }

  if (answeredClarifier && !isComplete) {
    effectiveMode = "clarifier";
  }

  const planState = await loadSitePlan(conversationId);
  const userMessageMode = planState?.status === "proposed" || wantsBuild ? "builder" : "advisor";

  const userMessage = await prisma.message.create({
    data: {
      role: "user",
      mode: userMessageMode,
      content: message,
      conversationId,
    },
  });

  if (!wasComplete && !structured && Object.keys(answers).length > 0) {
    const clarifier = buildClarificationMessage(getMissingFields(existingContext));
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "clarifier",
        content: clarifier.text,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "clarifier",
      missingFields: getMissingFields(existingContext),
      userMessage,
      assistantMessage,
    });
  }

  if (structured && isComplete && !conversation.siteId) {
    console.log("🔧 Creating site for conversation:", conversationId);

    const site = await prisma.site.create({
      data: {
        purpose: updatedContext.purpose,
        audience: updatedContext.audience,
        primaryConversion: updatedContext.action,
        toneAxis: updatedContext.tone,
        blogEnabled: updatedContext.blog === "yes",
        advisoryMode: "assistive",
        state: "draft",
        ownerId: authUserId ?? undefined,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { siteId: site.id },
    });

    console.log("✅ Site created with id:", site.id);
    siteId = site.id;
  }

  let designIntentLocked = false;
  if (siteId && isComplete) {
    const siteRecord = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        designIntentLockedAt: true,
        designIntent: true,
        visualSystem: true,
        visualSystemLockedAt: true,
        media: true,
        purpose: true,
        audience: true,
        toneAxis: true,
        blogEnabled: true,
      },
    });

    designIntentLocked = Boolean(siteRecord?.designIntentLockedAt);

    if (!designIntentLocked) {
      const decision = parseIntentDecision(message);
      const signals = deriveIntentSignals({
        purpose: updatedContext.purpose ?? siteRecord?.purpose,
        audience: updatedContext.audience ?? siteRecord?.audience,
        toneAxis: updatedContext.tone ?? siteRecord?.toneAxis,
        mediaHeavy: siteRecord?.blogEnabled ?? null,
      });
      const inferredIntent = inferDesignIntent(signals);

      if (decision) {
        const finalIntent = applyIntentMutation(inferredIntent, decision);
        const visualSystem = generateVisualSystem(finalIntent);
        const siteMedia = generateSiteMedia(finalIntent);
        await prisma.site.update({
          where: { id: siteId },
          data: {
            designIntent: toJson(finalIntent),
            designIntentLockedAt: new Date(),
            visualSystem: toJson(visualSystem),
            visualSystemLockedAt: new Date(),
            media: toJson(siteMedia),
          },
        });

        const assistantText = buildReadyMessage(updatedContext);
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "ready",
            content: assistantText,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          siteId,
          mode: "ready",
          missingFields: [],
          userMessage,
          assistantMessage,
        });
      }

      const assistantText = buildDesignIntentMessage(inferredIntent);
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "intent",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        siteId,
        mode: "intent",
        missingFields,
        userMessage,
        assistantMessage,
      });
    }

    if (designIntentLocked && siteRecord?.designIntent && (!siteRecord.visualSystem || !siteRecord.media)) {
      const visualSystem =
        siteRecord.visualSystem ?? generateVisualSystem(siteRecord.designIntent as DesignIntent);
      const siteMedia = siteRecord.media ?? generateSiteMedia(siteRecord.designIntent as DesignIntent);
      await prisma.site.update({
        where: { id: siteId },
        data: {
          visualSystem: toJson(visualSystem),
          visualSystemLockedAt: new Date(),
          media: toJson(siteMedia),
        },
      });
    }
  }

  if (lastAssistant?.mode === "ready" && !planState && isComplete) {
    if (!siteId) {
      return jsonResponse(500, { error: "Site ID is missing for plan generation." });
    }

    if (!designIntentLocked) {
      const signals = deriveIntentSignals({
        purpose: updatedContext.purpose,
        audience: updatedContext.audience,
        toneAxis: updatedContext.tone,
      });
      const inferredIntent = inferDesignIntent(signals);
      const assistantText = buildDesignIntentMessage(inferredIntent);
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "intent",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        siteId,
        mode: "intent",
        missingFields,
        userMessage,
        assistantMessage,
      });
    }

    let planResult: Awaited<ReturnType<typeof generateSitePlan>>;
    try {
      planResult = await generateSitePlan(openai, updatedContext, "Generate the initial site structure.");
    } catch {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    if (!planResult.plan || !planResult.explanation) {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    let creationResult: Awaited<ReturnType<typeof createSiteFromPlanTool>>;
    try {
      creationResult = await createSiteFromPlanTool({
        siteId,
        plan: planResult.plan,
        context: updatedContext,
        conversationId,
        ownerId: authUserId,
      });
    } catch {
      return jsonResponse(500, { error: "Unable to create site structure from plan." });
    }

    await saveSitePlan(conversationId, planResult.plan, "confirmed");

    const summaryLines = creationResult.pagesCreated.map((pageId) => {
      const page = planResult.plan.pages[pageId];
      const count = page ? page.sections.length : 0;
      return `• ${pageId} (${count} sections)`;
    });

    const assistantText =
      `${planResult.explanation}\n\n` +
      "I created the page structure (no copy or styling yet):\n" +
      `${summaryLines.join("\n")}\n\n` +
      "You can ask about the structure or request changes.";

    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "builder",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      siteId,
      mode: "builder",
      siteSnapshot: creationResult.snapshot,
      userMessage,
      assistantMessage,
    });
  }

  const shouldAnnounceReady =
    !wantsBuild && isComplete && lastAssistant?.mode !== "ready" && !planState;

  if (shouldAnnounceReady) {
    const assistantText = buildReadyMessage(updatedContext);
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "ready",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      siteId,
      mode: "ready",
      missingFields,
      userMessage,
      assistantMessage,
    });
  }

  if (effectiveMode === "clarifier" && missingFields.length > 0) {
    const clarifier = buildClarificationMessage(missingFields);
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "clarifier",
        content: clarifier.text,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "clarifier",
      missingFields,
      userMessage,
      assistantMessage,
    });
  }

  if (planState?.status === "confirmed" && wantsBuild) {
    const assistantText =
      "The site plan is already confirmed. If you want adjustments, tell me what to change.";
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "advisor",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "advisor",
      userMessage,
      assistantMessage,
    });
  }

  if (planState?.status === "proposed") {
    if (isAffirmative(message)) {
      try {
        const result = await createSiteFromPlanTool({
          siteId,
          plan: planState.plan,
          context: updatedContext,
          conversationId,
          ownerId: authUserId,
        });

        await saveSitePlan(conversationId, planState.plan, "confirmed");

        const summaryLines = result.pagesCreated.map((pageId) => {
          const page = planState.plan.pages[pageId];
          const count = page ? page.sections.length : 0;
          return `• ${pageId} (${count} sections)`;
        });

        const assistantText =
          "I'm going to create the page structure now. This will not add copy or styling yet.\n\n" +
          `I created:\n${summaryLines.join("\n")}\n\n` +
          "Next, we can refine section order, adjust goals, or add/remove sections.";

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: assistantText,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          siteId,
          siteSnapshot: result.snapshot,
          userMessage,
          assistantMessage,
        });
      } catch {
        return jsonResponse(500, { error: "Unable to create site from plan." });
      }
    }

    if (isNegative(message)) {
      await saveSitePlan(conversationId, planState.plan, "rejected");
      const assistantText = "Understood. Tell me what you'd like to change and I'll revise the plan.";
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    let planResult: Awaited<ReturnType<typeof generateSitePlan>>;
    try {
      planResult = await generateSitePlan(openai, updatedContext, message, planState.plan);
    } catch {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    if (!planResult.plan || !planResult.explanation) {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    await saveSitePlan(conversationId, planResult.plan, "proposed");
    const assistantText =
      `${planResult.explanation}\n\n` +
      `${JSON.stringify(planResult.plan, null, 2)}\n\n` +
      "Do you want me to proceed with this structure, or adjust it?";
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "builder",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "builder",
      sitePlan: planResult.plan,
      userMessage,
      assistantMessage,
    });
  }

  if (effectiveMode === "builder") {
    let planResult: Awaited<ReturnType<typeof generateSitePlan>>;
    try {
      planResult = await generateSitePlan(openai, updatedContext, message);
    } catch {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    if (!planResult.plan || !planResult.explanation) {
      return jsonResponse(500, { error: "Unable to generate a valid site plan." });
    }

    await saveSitePlan(conversationId, planResult.plan, "proposed");
    const assistantText =
      `${planResult.explanation}\n\n` +
      `${JSON.stringify(planResult.plan, null, 2)}\n\n` +
      "Do you want me to proceed with this structure, or adjust it?";
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "builder",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "builder",
      sitePlan: planResult.plan,
      userMessage,
      assistantMessage,
    });
  }

  if (planState?.status === "confirmed") {
    const snapshot = await getSiteSnapshot(siteId);
    if (!snapshot) {
      return jsonResponse(500, { error: "Site not found for confirmed plan." });
    }

    const siteRecord = await prisma.site.findUnique({ where: { id: siteId } });
    if (!siteRecord) {
      return jsonResponse(500, { error: "Site not found for confirmed plan." });
    }

    const prescriptiveActive = siteRecord.advisoryMode === "prescriptive" || prescriptivePreview;
    const shouldFirePrescriptiveMoment =
      prescriptiveActive &&
      (siteRecord.releaseState === "published" || prescriptivePreview) &&
      siteRecord.hasReceivedPrescriptiveMoment === false;

    const releaseDraft = await loadReleaseDraft(conversationId);
    const presentationDraft = await loadPresentationDraft(conversationId);
    const recommendationDraft = await loadRecommendationDraft(conversationId);
    const releaseIntent = detectReleaseIntent(message);
    const auditMode = inferAuditMode(message);
    const auditIntent = detectAuditIntent(message) || auditMode !== null;
    const presentationIntent = !auditIntent && detectPresentationIntent(message);
    const contentIntent = detectContentIntent(message);
    const recommendationIntent = detectRecommendationIntent(message);
    const advisoryModeChange = inferAdvisoryModeChange(message);
    const explainIntent = detectExplainIntent(message);

    if (releaseDraft) {
      if (isAffirmative(message)) {
        try {
          if (releaseDraft.tool === "createPreview") {
            const previewResult = await createPreviewTool({
              siteId,
              label: releaseDraft.args.label,
              conversationId,
            });
            await clearReleaseDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content:
                  `Preview ready: ${previewResult.previewUrl}\n` +
                  "This does not publish the site or change the live version.",
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (releaseDraft.tool === "publishSnapshot") {
            const publishResult = await publishSnapshotTool({
              siteId,
              snapshotId: releaseDraft.args.snapshotId,
              conversationId,
            });
            await clearReleaseDraft(conversationId);

            const siteRecord = await prisma.site.findUnique({ where: { id: siteId } });
            const prescriptiveActive =
              siteRecord?.advisoryMode === "prescriptive" || prescriptivePreview;
            const shouldPrescribe =
              prescriptiveActive && siteRecord?.hasReceivedPrescriptiveMoment === false;

            let assistantText =
              "Published. This replaces the currently live site.\n" +
              `Published at ${publishResult.publishedAt.toISOString()}.`;

            if (shouldPrescribe) {
              const fullState = await getFullSiteState(siteId);
              if (fullState) {
                const history = await fetchRecommendationHistory(siteId);
                const themeLocked = Boolean(
                  await prisma.mutationLog.findFirst({ where: { siteId, tool: "applyTheme" } }),
                );
                const recs = generatePrescriptiveRecommendations({
                  snapshot,
                  fullState,
                  context: updatedContext,
                  voice: updatedVoice,
                  history,
                  themeLocked,
                });

                if (recs.length > 0) {
                  const actionable = recs.filter((rec) => rec.recommendationId !== "leaveAsIs");
                  const leave = recs.find((rec) => rec.recommendationId === "leaveAsIs");
                  const limited = actionable.slice(0, 2);
                  const finalRecs = leave ? [...limited, leave] : limited;
                  const created = await createRecommendations({
                    siteId,
                    auditRunId: null,
                    recommendations: finalRecs,
                    conversationId,
                  });

                  await saveRecommendationDraft(conversationId, {
                    auditRunId: null,
                    mode: "coherence",
                    recommendations: created,
                  });

                  assistantText = formatFirstPrescriptiveMoment(created, updatedVoice);
                } else {
                  assistantText = "Your site is live. I don't have any high-confidence changes to recommend right now.";
                }
              }

            }

            if (shouldPrescribe && siteRecord?.advisoryMode === "prescriptive") {
              await prisma.site.update({
                where: { id: siteId },
                data: { hasReceivedPrescriptiveMoment: true },
              });
            }

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: assistantText,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (releaseDraft.tool === "rollbackToSnapshot") {
            await rollbackToSnapshotTool({
              siteId,
              snapshotId: releaseDraft.args.snapshotId,
              conversationId,
            });
            await clearReleaseDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: "Rolled back the live site to the selected snapshot.",
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }
        } catch {
          await clearReleaseDraft(conversationId);
          return jsonResponse(500, { error: "Unable to apply release action." });
        }
      }

      if (isNegative(message)) {
        await clearReleaseDraft(conversationId);
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Understood. Tell me what release action you want instead.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: "I have a pending release action. Say yes to proceed, or no to cancel.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    if (presentationDraft) {
      if (isAffirmative(message)) {
        try {
          if (presentationDraft.tool === "applyTheme") {
            await applyThemeTool({
              siteId,
              themeId: presentationDraft.args.themeId,
              conversationId,
            });
            await clearPresentationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Applied theme ${THEME_REGISTRY[presentationDraft.args.themeId].label}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (presentationDraft.tool === "switchSectionVariant") {
            await switchSectionVariantTool({
              siteId,
              sectionInstanceId: presentationDraft.args.sectionInstanceId,
              variantId: presentationDraft.args.variantId,
              conversationId,
            });
            await clearPresentationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Applied variant ${presentationDraft.args.variantId}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }
        } catch {
          await clearPresentationDraft(conversationId);
          return jsonResponse(500, { error: "Unable to apply presentation change." });
        }
      }

      if (isNegative(message)) {
        await clearPresentationDraft(conversationId);
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Understood. Tell me what presentation change you want instead.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: "I have a pending presentation change. Say yes to apply it, or no to discard.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    if (advisoryModeChange) {
      await prisma.site.update({
        where: { id: siteId },
        data: { advisoryMode: advisoryModeChange },
      });

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content:
            advisoryModeChange === "prescriptive"
              ? "Prescriptive mode enabled. I'll lead with ranked recommendations and ask before acting."
              : "Assistive mode enabled. I'll wait for your request before recommending changes.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    const voiceCurrent = await loadVoiceContract(siteId);
    const voiceInput = extractVoiceAnswers(message);
    const voiceAnswered = Object.keys(voiceInput.answers).length > 0;
    const updatedVoice: VoiceContract = {
      audienceLevel: voiceInput.answers.audienceLevel ?? voiceCurrent.audienceLevel,
      tone: voiceInput.answers.tone ?? voiceCurrent.tone,
      assertiveness: voiceInput.answers.assertiveness ?? voiceCurrent.assertiveness,
      verbosity: voiceInput.answers.verbosity ?? voiceCurrent.verbosity,
    };

    if (voiceAnswered) {
      await saveVoiceContract(siteId, updatedVoice);
    }

    const missingVoice = getMissingVoiceFields(updatedVoice);
    const voiceComplete = missingVoice.length === 0;

    if (voiceAnswered && lastAssistant?.mode === "voice") {
      if (!voiceComplete) {
        const voicePrompt = buildVoiceMessage(missingVoice);
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "voice",
            content: voicePrompt.text,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "voice",
          userMessage,
          assistantMessage,
        });
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "voice",
          content: "Voice locked. Tell me which page and section you want me to write.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "voice",
        userMessage,
        assistantMessage,
      });
    }

    const draft = await loadContentDraft(conversationId);

    if (!recommendationDraft && shouldFirePrescriptiveMoment) {
      const fullState = await getFullSiteState(siteId);
      if (!fullState) {
        return jsonResponse(500, { error: "Missing site state." });
      }

      const history = await fetchRecommendationHistory(siteId);
      const themeLocked = Boolean(
        await prisma.mutationLog.findFirst({ where: { siteId, tool: "applyTheme" } }),
      );
      const recs = generatePrescriptiveRecommendations({
        snapshot,
        fullState,
        context: updatedContext,
        voice: updatedVoice,
        history,
        themeLocked,
      });

      let assistantText =
        "Your site is live. I don't have any high-confidence changes to recommend right now.";

      if (recs.length > 0) {
        const actionable = recs.filter((rec) => rec.recommendationId !== "leaveAsIs");
        const leave = recs.find((rec) => rec.recommendationId === "leaveAsIs");
        const limited = actionable.slice(0, 2);
        const finalRecs = leave ? [...limited, leave] : limited;
        const created = await createRecommendations({
          siteId,
          auditRunId: null,
          recommendations: finalRecs,
          conversationId,
        });

        await saveRecommendationDraft(conversationId, {
          auditRunId: null,
          mode: "coherence",
          recommendations: created,
        });

        assistantText = formatFirstPrescriptiveMoment(created, updatedVoice);
      }

      if (siteRecord.releaseState === "published") {
        await prisma.site.update({
          where: { id: siteId },
          data: { hasReceivedPrescriptiveMoment: true },
        });
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    if (recommendationDraft) {
      if (draft) {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "You have a pending content draft. Apply or discard it before I act on recommendations.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (explainIntent) {
        const selection =
          recommendationDraft.selectedIndex !== null && recommendationDraft.selectedIndex !== undefined
            ? recommendationDraft.selectedIndex + 1
            : extractRecommendationSelection(message) ?? 1;
        const chosen = recommendationDraft.recommendations[selection - 1];
        if (!chosen) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "Tell me which recommendation to explain (1, 2, or 3).",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (chosen.recommendationId === "leaveAsIs") {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "That recommendation is a restraint call, not a change. It preserves the strongest element.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (chosen.id && (await hasExplainedRecommendation(conversationId, chosen.id))) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "I've already explained that recommendation in this session.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        try {
          const explanationResult = await explainRecommendationTool({
            siteId,
            recommendationId: chosen.recommendationId,
          });

          if (chosen.id) {
            await saveRecommendationExplanation(conversationId, chosen.id);
          }

          const { explanation } = explanationResult;
          const assistantText =
            `${explanation.context}\n\n` +
            `Impact: ${explanation.criteria.impact}\n` +
            `Alignment: ${explanation.criteria.alignment}\n` +
            `Confidence: ${explanation.criteria.confidence}\n` +
            `Disruption: ${explanation.criteria.disruption}\n\n` +
            `Tradeoffs: ${explanation.tradeoffs.join("; ")}\n` +
            (explanation.whyNotAlternatives.length > 0
              ? `Why not alternatives: ${explanation.whyNotAlternatives.join(" ")}` + "\n\n"
              : "\n") +
            "If you want to apply it, I can do that. If not, we can leave it.";

          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: assistantText.trim(),
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message === "Recommendation rejected"
              ? "That recommendation has been declined, so I won't revisit it."
              : "I can't explain that recommendation right now.";
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: message,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }
      }

      const selection =
        recommendationDraft.selectedIndex !== null && recommendationDraft.selectedIndex !== undefined
          ? recommendationDraft.selectedIndex + 1
          : extractRecommendationSelection(message) ?? (isAffirmative(message) ? 1 : null);
      if (selection !== null) {
        const selectedIndex = selection - 1;
        const chosen = recommendationDraft.recommendations[selectedIndex];
        if (!chosen) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "Pick a valid recommendation number from the list.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (
          (chosen.tool === "generateSectionContent" || chosen.tool === "rewriteSectionContent") &&
          !voiceComplete
        ) {
          await saveRecommendationDraft(conversationId, {
            ...recommendationDraft,
            selectedIndex,
          });

          const voicePrompt = buildVoiceMessage(missingVoice);
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "voice",
              content: voicePrompt.text,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "voice",
            userMessage,
            assistantMessage,
          });
        }

        try {
          const ids = recommendationDraft.recommendations
            .map((rec) => rec.id)
            .filter((id): id is string => Boolean(id));
          const selectedId = chosen.id ? [chosen.id] : [];
          const otherIds = ids.filter((id) => !selectedId.includes(id));

          if (selectedId.length > 0) {
            await updateRecommendationStatus(selectedId, "accepted");
          }
          if (otherIds.length > 0) {
            await updateRecommendationStatus(otherIds, "deferred");
          }

          if (!chosen.tool) {
            await clearRecommendationDraft(conversationId);
            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "advisor",
                content: `Understood. I'll leave ${chosen.title} as-is.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "advisor",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "addPage") {
            await addPageTool({
              siteId,
              pageId: chosen.args.pageId as PageId,
              goal: chosen.args.goal as PageGoal,
              sections: chosen.args.sections as SectionId[],
              context: updatedContext,
              conversationId,
            });
            await clearRecommendationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Added ${chosen.args.pageId}. This is structure-only.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "addSection") {
            await addSectionTool({
              siteId,
              pageId: chosen.args.pageId as PageId,
              sectionId: chosen.args.sectionId as SectionId,
              context: updatedContext,
              conversationId,
            });
            await clearRecommendationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Added ${chosen.args.sectionId} to ${chosen.args.pageId}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "reorderSections") {
            await reorderSectionsTool({
              siteId,
              pageId: chosen.args.pageId as PageId,
              orderedSectionIds: chosen.args.orderedSectionIds as SectionId[],
              context: updatedContext,
              conversationId,
            });
            await clearRecommendationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Reordered sections on ${chosen.args.pageId}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "applyTheme") {
            await applyThemeTool({
              siteId,
              themeId: chosen.args.themeId as ThemeId,
              conversationId,
            });
            await clearRecommendationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Applied theme ${THEME_REGISTRY[chosen.args.themeId as ThemeId].label}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "switchSectionVariant") {
            await switchSectionVariantTool({
              siteId,
              sectionInstanceId: chosen.args.sectionInstanceId as string,
              variantId: chosen.args.variantId as string,
              conversationId,
            });
            await clearRecommendationDraft(conversationId);

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: `Applied variant ${chosen.args.variantId}.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
            });
          }

          if (chosen.tool === "generateSectionContent") {
            const draftResult = await generateSectionContentTool({
              siteId,
              pageId: chosen.args.pageId as PageId,
              sectionInstanceId: chosen.args.sectionInstanceId as string,
              voice: updatedVoice,
              context: updatedContext,
              conversationId,
            });

            await saveContentDraft(conversationId, {
              sectionInstanceId: draftResult.sectionInstanceId,
              pageId: draftResult.pageId,
              sectionId: draftResult.sectionId,
              content: draftResult.content,
            });
            await clearRecommendationDraft(conversationId);

            const assistantText =
              `Draft for ${draftResult.pageId} ${draftResult.sectionId}:\n\n` +
              `${JSON.stringify(draftResult.content, null, 2)}\n\n` +
              "Do you want me to apply this, or adjust it?";

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: assistantText,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
              content: draftResult.content,
            });
          }

          if (chosen.tool === "rewriteSectionContent") {
            const draftResult = await rewriteSectionContentTool({
              siteId,
              sectionInstanceId: chosen.args.sectionInstanceId as string,
              instruction: chosen.args.instruction as string,
              voice: updatedVoice,
              context: updatedContext,
            });

            await saveContentDraft(conversationId, {
              sectionInstanceId: draftResult.sectionInstanceId,
              pageId: draftResult.pageId,
              sectionId: draftResult.sectionId,
              content: draftResult.content,
              instruction: chosen.args.instruction as string,
            });
            await clearRecommendationDraft(conversationId);

            const assistantText =
              `Draft for ${draftResult.pageId} ${draftResult.sectionId}:\n\n` +
              `${JSON.stringify(draftResult.content, null, 2)}\n\n` +
              "Do you want me to apply this, or adjust it?";

            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "builder",
                content: assistantText,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "builder",
              userMessage,
              assistantMessage,
              content: draftResult.content,
            });
          }
        } catch {
          await clearRecommendationDraft(conversationId);
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "I couldn't apply that recommendation under the current constraints.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }
      }

      if (isNegative(message)) {
        const ids = recommendationDraft.recommendations
          .map((rec) => rec.id)
          .filter((id): id is string => Boolean(id));
        await updateRecommendationStatus(ids, "rejected");
        await clearRecommendationDraft(conversationId);

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Understood. I won't push those changes.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: "Which recommendation should I apply? Reply with the number from the list.",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    if ((contentIntent || draft) && !voiceComplete) {
      const voicePrompt = buildVoiceMessage(missingVoice);
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "voice",
          content: voicePrompt.text,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "voice",
        userMessage,
        assistantMessage,
      });
    }

    if (draft) {
      if (releaseIntent) {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "You have a pending content draft. Say yes to apply it, or no to discard before release.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (presentationIntent) {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "You have a pending content draft. Say yes to apply it, or no to discard.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (auditIntent) {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "You have a pending content draft. Apply or discard it before I run an audit.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (isAffirmative(message)) {
        await applyContentDraft({
          siteId,
          draft,
          conversationId,
        });
        await clearContentDraft(conversationId);

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Applied. Tell me the next section you want to draft.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (isNegative(message)) {
        await recordContentHistory({
          siteId,
          sectionInstanceId: draft.sectionInstanceId,
          content: draft.content,
          status: "rejected",
          reason: message,
          conversationId,
        });
        await clearContentDraft(conversationId);

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Understood. Tell me what to change and I'll revise the section.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      await recordContentHistory({
        siteId,
        sectionInstanceId: draft.sectionInstanceId,
        content: draft.content,
        status: "rejected",
        reason: message,
        conversationId,
      });

      try {
        const rewriteResult = await rewriteSectionContentTool({
          siteId,
          sectionInstanceId: draft.sectionInstanceId,
          instruction: message,
          voice: updatedVoice,
          context: updatedContext,
          baseContent: draft.content,
        });

        await saveContentDraft(conversationId, {
          sectionInstanceId: rewriteResult.sectionInstanceId,
          pageId: rewriteResult.pageId,
          sectionId: rewriteResult.sectionId,
          content: rewriteResult.content,
          instruction: message,
        });

        const assistantText =
          `Draft for ${rewriteResult.pageId} ${rewriteResult.sectionId}:\n\n` +
          `${JSON.stringify(rewriteResult.content, null, 2)}\n\n` +
          "Do you want me to apply this, or adjust it?";

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: assistantText,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
          content: rewriteResult.content,
        });
      } catch {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "I couldn't rewrite that section under the current constraints. Try a simpler instruction.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }
    }

    const intentCount = [releaseIntent, presentationIntent, contentIntent, auditIntent].filter(Boolean)
      .length;
    if (intentCount > 1) {
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: "I can handle release, theme/layout, or content first. Which should I do?",
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    if (releaseIntent) {
      const releaseSnapshots = await listReleaseSnapshots(siteId);
      const currentSite = await prisma.site.findUnique({ where: { id: siteId } });
      if (!currentSite) {
        return jsonResponse(500, { error: "Site not found for release." });
      }
      const currentReleaseState = (currentSite.releaseState as ReleaseState) ?? "draft";

      const proposedRelease = await inferReleaseToolCall(
        openai,
        message,
        currentReleaseState,
        currentSite.publishedSnapshotId ?? null,
        releaseSnapshots,
      );
      const parsedRelease = releaseToolCallSchema.safeParse(proposedRelease);
      const releaseReason =
        typeof proposedRelease.reason === "string" ? proposedRelease.reason.trim() : "";

      if (!parsedRelease.success || parsedRelease.data.tool === "none") {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content:
              "I can create a preview link, publish a snapshot, or roll back to a published snapshot. What should I do?",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (parsedRelease.data.tool === "createPreview") {
        const explanation =
          releaseReason ||
          "I can create a preview link that reflects the current draft without publishing it.";

        await saveReleaseDraft(conversationId, {
          tool: "createPreview",
          args: { label: parsedRelease.data.arguments.label },
          reason: explanation,
        });

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: `${explanation}\n\nDo you want me to create the preview link?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
        });
      }

      if (parsedRelease.data.tool === "publishSnapshot") {
        const snapshotId = parsedRelease.data.arguments.snapshotId;
        const snapshotRecord = releaseSnapshots.find((item) => item.id === snapshotId);
        if (!snapshotRecord) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content:
                "I couldn't find that snapshot. Want me to create a preview first?",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const explanation =
          releaseReason ||
          "This will make the selected snapshot live and replace the currently published site.";

        await saveReleaseDraft(conversationId, {
          tool: "publishSnapshot",
          args: { snapshotId },
          reason: explanation,
        });

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: `${explanation}\n\nDo you want me to publish it?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
        });
      }

      if (parsedRelease.data.tool === "rollbackToSnapshot") {
        const snapshotId = parsedRelease.data.arguments.snapshotId;
        const snapshotRecord = releaseSnapshots.find((item) => item.id === snapshotId);
        if (!snapshotRecord || snapshotRecord.state !== "published") {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "I can only roll back to a published snapshot. Which published version should I use?",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (currentSite.publishedSnapshotId === snapshotId) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "That snapshot is already live. Want to roll back to a different version?",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const explanation =
          releaseReason ||
          "I can roll back to the selected published snapshot without changing your draft.";

        await saveReleaseDraft(conversationId, {
          tool: "rollbackToSnapshot",
          args: { snapshotId },
          reason: explanation,
        });

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: `${explanation}\n\nDo you want me to roll back?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
        });
      }
    }

    if (presentationIntent) {
      const proposedPresentation = await inferPresentationToolCall(
        openai,
        message,
        snapshot,
        updatedContext,
        updatedVoice,
      );
      const parsedPresentation = presentationToolCallSchema.safeParse(proposedPresentation);
      const reasonText =
        typeof proposedPresentation.reason === "string" ? proposedPresentation.reason.trim() : "";

      if (!parsedPresentation.success || parsedPresentation.data.tool === "none") {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content:
              "I can apply a theme or switch a layout variant. Tell me which theme to use or which section to adjust.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      if (parsedPresentation.data.tool === "applyTheme") {
        const themeId = parsedPresentation.data.arguments.themeId;
        const theme = THEME_REGISTRY[themeId];
        if (!theme) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "That theme is not available. Choose one of the approved themes.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (snapshot.themeId === themeId) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: `You're already on ${theme.label}. Want a different theme?`,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const explanationBase =
          reasonText || `I recommend ${theme.label}. It emphasizes ${theme.intent}`;
        const explanation = `${explanationBase.endsWith(".") ? explanationBase : `${explanationBase}.`} This changes presentation only, not content.`;

        await savePresentationDraft(conversationId, {
          tool: "applyTheme",
          args: { themeId },
          reason: explanation,
        });

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: `${explanation}\n\nDo you want me to apply ${theme.label}?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
        });
      }

      if (parsedPresentation.data.tool === "switchSectionVariant") {
        const { sectionInstanceId, variantId } = parsedPresentation.data.arguments;
        const sectionTarget = snapshot.pages
          .flatMap((page) =>
            page.sections.map((section) => ({
              pageId: page.pageId,
              sectionInstanceId: section.sectionInstanceId,
              sectionId: section.sectionId,
              variantId: section.variantId ?? getDefaultVariant(section.sectionId),
            })),
          )
          .find((section) => section.sectionInstanceId === sectionInstanceId);

        if (!sectionTarget) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "Which section should I adjust? Example: \"Switch the home case grid to twoColumn.\"",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (!isAllowedVariant(sectionTarget.sectionId, variantId)) {
          const allowed = SECTION_VARIANTS[sectionTarget.sectionId].variants.join(", ");
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: `That variant is not allowed for ${sectionTarget.sectionId}. Allowed: ${allowed}.`,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        if (sectionTarget.variantId === variantId) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: `That section is already using ${variantId}. Want a different variant?`,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const explanationBase =
          reasonText ||
          `I can switch ${sectionTarget.pageId} ${sectionTarget.sectionId} to ${variantId}`;
        const explanation = `${explanationBase.endsWith(".") ? explanationBase : `${explanationBase}.`} This changes layout only, not content.`;

        await savePresentationDraft(conversationId, {
          tool: "switchSectionVariant",
          args: { sectionInstanceId, variantId },
          reason: explanation,
        });

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "builder",
            content: `${explanation}\n\nDo you want me to apply this variant?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "builder",
          userMessage,
          assistantMessage,
        });
      }
    }

    if (auditIntent) {
      if (!auditMode) {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content:
              "Which audit should I run? Options: structure, content, voice, presentation, conversion, coherence.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      try {
        const auditResult = await auditSiteTool({
          siteId,
          mode: auditMode,
          context: updatedContext,
          voice: updatedVoice,
          conversationId,
        });

        const formatted = formatAuditResponse(auditResult.findings);
        if (prescriptiveActive) {
          const fullState = await getFullSiteState(siteId);
          if (!fullState) throw new Error("Missing site state");
          const history = await fetchRecommendationHistory(siteId);
          const themeLocked = Boolean(
            await prisma.mutationLog.findFirst({ where: { siteId, tool: "applyTheme" } }),
          );
          const recs = generatePrescriptiveRecommendations({
            snapshot,
            fullState,
            context: updatedContext,
            voice: updatedVoice,
            history,
            themeLocked,
          });

          if (recs.length === 0) {
            const assistantMessage = await prisma.message.create({
              data: {
                role: "assistant",
                mode: "audit",
                content: `${formatted}\n\nI don't have any high-confidence changes to recommend right now.`,
                conversationId,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            return jsonResponse(200, {
              conversationId,
              mode: "advisor",
              userMessage,
              assistantMessage,
            });
          }

          const created = await createRecommendations({
            siteId,
            auditRunId: auditResult.auditRunId,
            recommendations: recs,
            conversationId,
          });

          await saveRecommendationDraft(conversationId, {
            auditRunId: auditResult.auditRunId,
            mode: auditMode,
            recommendations: created,
          });

          const reminder = buildPreviouslyRecommendedReminder(created, history);
          const recommendationText = formatPrescriptiveRecommendations(created, updatedVoice, {
            includeLeaveAsIs: true,
            includeTradeoffs: updatedVoice.audienceLevel === "expert",
          });
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "audit",
              content:
                `${formatted}\n\n` +
                `${reminder ? `${reminder}\n\n` : ""}` +
                `If I were optimizing this next, I'd focus on:\n${recommendationText}\n\nWhich should I apply?`,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "audit",
            content: `${formatted}\n\nDo you want me to propose changes for any of these?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      } catch {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "I couldn't complete the audit. Try a different mode.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }
    }

    const wantsRecommendations =
      (recommendationIntent && !presentationIntent && !contentIntent && !releaseIntent && !auditIntent) ||
      (lastAssistant?.mode === "audit" && isAffirmative(message));

    if (wantsRecommendations) {
      try {
        if (!prescriptiveActive) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content:
                "I can provide ranked recommendations once prescriptive mode is enabled. If you want that, say \"enable prescriptive mode\".",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const latestAudit = await getLatestAuditRun(siteId);
        const auditSource =
          latestAudit ??
          (await auditSiteTool({
            siteId,
            mode: "coherence",
            context: updatedContext,
            voice: updatedVoice,
            conversationId,
          }));

        const findings = latestAudit ? latestAudit.findings : auditSource.findings;
        const auditRunId = latestAudit ? latestAudit.id : auditSource.auditRunId;
        const fullState = await getFullSiteState(siteId);
        if (!fullState) throw new Error("Missing site state");
        const history = await fetchRecommendationHistory(siteId);
        const themeLocked = Boolean(
          await prisma.mutationLog.findFirst({ where: { siteId, tool: "applyTheme" } }),
        );
        const recs = generatePrescriptiveRecommendations({
          snapshot,
          fullState,
          context: updatedContext,
          voice: updatedVoice,
          history,
          themeLocked,
        });

        if (recs.length === 0) {
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "advisor",
              content: "I don't have any high-confidence recommendations right now.",
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "advisor",
            userMessage,
            assistantMessage,
          });
        }

        const created = await createRecommendations({
          siteId,
          auditRunId,
          recommendations: recs,
          conversationId,
        });

        await saveRecommendationDraft(conversationId, {
          auditRunId,
          mode: (latestAudit?.mode as AuditMode | undefined) ?? "coherence",
          recommendations: created,
        });

        const reminder = buildPreviouslyRecommendedReminder(created, history);
        const recommendationText = formatPrescriptiveRecommendations(created, updatedVoice, {
          includeLeaveAsIs: true,
          includeTradeoffs: updatedVoice.audienceLevel === "expert",
        });
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content:
              `${reminder ? `${reminder}\n\n` : ""}` +
              `Here are my top recommendations:\n${recommendationText}\n\nWhich should I apply?`,
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      } catch {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "I couldn't generate recommendations right now.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }
    }

    if (contentIntent) {
      const proposedContentTool = await inferContentToolCall(openai, message, snapshot, updatedVoice);
      const parsedContentTool = contentToolCallSchema.safeParse(proposedContentTool);

      if (!parsedContentTool.success || parsedContentTool.data.tool === "none") {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "Which page and section should I write? Example: \"Write the home hero.\"",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }

      try {
        if (parsedContentTool.data.tool === "generateSectionContent") {
          const { pageId, sectionInstanceId } = parsedContentTool.data.arguments;
          const draftResult = await generateSectionContentTool({
            siteId,
            pageId,
            sectionInstanceId,
            voice: updatedVoice,
            context: updatedContext,
            conversationId,
          });

          await saveContentDraft(conversationId, {
            sectionInstanceId: draftResult.sectionInstanceId,
            pageId: draftResult.pageId,
            sectionId: draftResult.sectionId,
            content: draftResult.content,
          });

          const assistantText =
            `Draft for ${draftResult.pageId} ${draftResult.sectionId}:\n\n` +
            `${JSON.stringify(draftResult.content, null, 2)}\n\n` +
            "Do you want me to apply this, or adjust it?";

          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "builder",
              content: assistantText,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "builder",
            userMessage,
            assistantMessage,
            content: draftResult.content,
          });
        }

        if (parsedContentTool.data.tool === "rewriteSectionContent") {
          const { sectionInstanceId, instruction } = parsedContentTool.data.arguments;
          const draftResult = await rewriteSectionContentTool({
            siteId,
            sectionInstanceId,
            instruction,
            voice: updatedVoice,
            context: updatedContext,
          });

          await saveContentDraft(conversationId, {
            sectionInstanceId: draftResult.sectionInstanceId,
            pageId: draftResult.pageId,
            sectionId: draftResult.sectionId,
            content: draftResult.content,
            instruction,
          });

          const assistantText =
            `Draft for ${draftResult.pageId} ${draftResult.sectionId}:\n\n` +
            `${JSON.stringify(draftResult.content, null, 2)}\n\n` +
            "Do you want me to apply this, or adjust it?";

          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              mode: "builder",
              content: assistantText,
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          return jsonResponse(200, {
            conversationId,
            mode: "builder",
            userMessage,
            assistantMessage,
            content: draftResult.content,
          });
        }
      } catch {
        const assistantMessage = await prisma.message.create({
          data: {
            role: "assistant",
            mode: "advisor",
            content: "I couldn't generate content under the current constraints. Try a narrower request.",
            conversationId,
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return jsonResponse(200, {
          conversationId,
          mode: "advisor",
          userMessage,
          assistantMessage,
        });
      }
    }

    const proposedTool = await inferToolCall(openai, message, snapshot, updatedContext);
    const parsedTool = toolCallSchema.safeParse(proposedTool);

    if (!parsedTool.success || parsedTool.data.tool === "none") {
      const assistantText =
        "Tell me what structural change you'd like to make (add a page, add a section, reorder sections, or enable the blog).";
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }

    try {
      let assistantText = "";
      let toolResult: unknown = null;

      switch (parsedTool.data.tool) {
        case "addPage": {
          const { pageId, goal, sections } = parsedTool.data.arguments;
          await addPageTool({
            siteId,
            pageId,
            goal,
            sections,
            context: updatedContext,
            conversationId,
          });
          assistantText =
            `I'm going to add the ${pageId} page using the approved section types. This will not add copy or styling yet.\n\n` +
            `Added ${pageId} with ${sections.length} sections.`;
          toolResult = { pageId };
          break;
        }
        case "addSection": {
          const { pageId, sectionId, position } = parsedTool.data.arguments;
          await addSectionTool({
            siteId,
            pageId,
            sectionId,
            position,
            context: updatedContext,
            conversationId,
          });
          assistantText =
            `I'm going to add ${sectionId} to ${pageId}. This is structure-only.\n\n` +
            `Added ${sectionId} to ${pageId}.`;
          toolResult = { pageId, sectionId };
          break;
        }
        case "reorderSections": {
          const { pageId, orderedSectionIds } = parsedTool.data.arguments;
          await reorderSectionsTool({
            siteId,
            pageId,
            orderedSectionIds,
            context: updatedContext,
            conversationId,
          });
          assistantText =
            `I'm going to reorder sections on ${pageId}.\n\n` +
            `New order: ${orderedSectionIds.join(", ")}.`;
          toolResult = { pageId };
          break;
        }
        case "enableBlog": {
          await enableBlogTool({
            siteId,
            context: updatedContext,
            conversationId,
          });
          assistantText =
            "I'm going to enable the blog using the canonical structure. This is structure-only.\n\n" +
            "Blog page added.";
          toolResult = { pageId: "blog" };
          break;
        }
      }

      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "builder",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "builder",
        siteId,
        toolResult,
        userMessage,
        assistantMessage,
      });
    } catch {
      const assistantText =
        "I couldn't apply that change under the current schema. Tell me what to adjust and I'll try again.";
      const assistantMessage = await prisma.message.create({
        data: {
          role: "assistant",
          mode: "advisor",
          content: assistantText,
          conversationId,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return jsonResponse(200, {
        conversationId,
        mode: "advisor",
        userMessage,
        assistantMessage,
      });
    }
  }

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  });

  const contextSummary = buildContextSummary(updatedContext);
  const systemPrompt = ADVISOR_PROMPT;
  const input = [
    inputText("system", systemPrompt),
    ...(extraSystemPrompt
      ? [inputText("system", extraSystemPrompt)]
      : []),
    ...(missingFields.length > 0
      ? [inputText("system", `Missing contract fields: ${missingFields.join(", ")}. Ask only for these.`)]
      : []),
    ...(contextSummary
      ? [inputText("system", contextSummary)]
      : []),
    ...history
      .reverse()
      .filter((entry) => entry.role === "user" || entry.role === "assistant")
      .map((entry) => inputText(entry.role as InputRole, entry.content)),
  ];

  try {
    if (stream) {
      return await streamAdvisorResponse({
        openai,
        input,
        temperature: ADVISOR_TEMPERATURE,
        conversationId,
        siteId,
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: ADVISOR_TEMPERATURE,
      input,
    });

    const assistantText = extractOutputText(response);
    if (!assistantText) {
      return jsonResponse(500, { error: "OpenAI returned no output" });
    }

    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        mode: "advisor",
        content: assistantText,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return jsonResponse(200, {
      conversationId,
      mode: "advisor",
      userMessage,
      assistantMessage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error during chat request";
    return jsonResponse(500, { error: message });
  }
};
