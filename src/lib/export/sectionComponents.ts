export type SectionTemplate = {
  fileName: string;
  componentName: string;
  code: string;
};

const sharedImports = `import { visualSystem, fontFamilies } from "../design/visualSystem";
import type { VisualSystem } from "../design/visualSystem";
import { getHeroMedia, getMediaById } from "../design/siteMedia";
import type { SiteMedia } from "../design/siteMedia";
`;

const withProps = (componentName: string, body: string) => `type SectionProps = {
  content: any;
  visualSystem: VisualSystem;
  media?: SiteMedia;
};

export function ${componentName}({ content, media }: SectionProps) {
${body}
}
`;

export const SECTION_COMPONENT_TEMPLATES: Record<string, SectionTemplate> = {
  heroEditorial: {
    fileName: "HeroEditorial.tsx",
    componentName: "HeroEditorial",
    code: `${sharedImports}
${withProps(
  "HeroEditorial",
  `  const headline = content?.headline || "Headline goes here";
  const subhead = content?.subhead || "Add a concise subhead that explains the value.";
  const action = content?.primaryActionLabel || "Get in touch";
  const explicitMedia = content?.mediaId ? getMediaById(content.mediaId) : null;
  const heroMedia = explicitMedia ?? getHeroMedia();
  const mediaOpacity = heroMedia?.status === "placeholder" ? 0.75 : 1;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-8"
      style={{ borderColor: visualSystem.color.surface }}
    >
      {heroMedia ? (
        <div className="absolute inset-0">
          {heroMedia.kind === "video" ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={heroMedia.poster}
              className="h-full w-full object-cover motion-reduce:hidden"
              style={{ opacity: mediaOpacity }}
            >
              <source src={heroMedia.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={heroMedia.src}
              alt={heroMedia.alt || "Hero background"}
              className="h-full w-full object-cover"
              style={{ opacity: mediaOpacity }}
              loading="eager"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: visualSystem.color.background, opacity: 0.6 }}
          />
        </div>
      ) : null}
      <div className="relative z-10 space-y-4">
        <div className="text-4xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
          {headline}
        </div>
        <div className="text-base" style={{ color: visualSystem.color.muted }}>
          {subhead}
        </div>
        <button
          className="inline-flex items-center rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: visualSystem.color.primary, color: visualSystem.color.primary }}
        >
          {action}
        </button>
      </div>
    </div>
  );`,
)}`,
  },
  heroSplit: {
    fileName: "HeroSplit.tsx",
    componentName: "HeroSplit",
    code: `${sharedImports}
${withProps(
  "HeroSplit",
  `  const headline = content?.headline || "Headline goes here";
  const subhead = content?.subhead || "Add a concise subhead that explains the value.";
  const primary = content?.primaryActionLabel || "Primary action";
  const secondary = content?.secondaryActionLabel || "Secondary action";
  const explicitMedia = content?.mediaId ? getMediaById(content.mediaId) : null;
  const heroMedia = explicitMedia ?? getHeroMedia();
  const mediaOpacity = heroMedia?.status === "placeholder" ? 0.75 : 1;

  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start">
      <div className="space-y-4">
        <div className="text-4xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
          {headline}
        </div>
        <div className="text-base" style={{ color: visualSystem.color.muted }}>
          {subhead}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: visualSystem.color.primary, color: visualSystem.color.primary }}
          >
            {primary}
          </button>
          <button
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: visualSystem.color.muted, color: visualSystem.color.muted }}
          >
            {secondary}
          </button>
        </div>
      </div>
      <div className="relative h-56 overflow-hidden rounded-2xl" style={{ background: visualSystem.color.surface }}>
        {heroMedia ? (
          heroMedia.kind === "video" ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={heroMedia.poster}
              className="h-full w-full object-cover motion-reduce:hidden"
              style={{ opacity: mediaOpacity }}
            >
              <source src={heroMedia.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={heroMedia.src}
              alt={heroMedia.alt || "Hero media"}
              className="h-full w-full object-cover"
              style={{ opacity: mediaOpacity }}
              loading="eager"
            />
          )
        ) : null}
      </div>
    </div>
  );`,
)}`,
  },
  heroMinimal: {
    fileName: "HeroMinimal.tsx",
    componentName: "HeroMinimal",
    code: `${sharedImports}
${withProps(
  "HeroMinimal",
  `  const headline = content?.headline || "Headline goes here";
  const subhead = content?.subhead || "Add a concise subhead.";
  const explicitMedia = content?.mediaId ? getMediaById(content.mediaId) : null;
  const heroMedia = explicitMedia ?? getHeroMedia();
  const mediaOpacity = heroMedia?.status === "placeholder" ? 0.75 : 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: visualSystem.color.surface }}>
      {heroMedia ? (
        <img
          src={heroMedia.src}
          alt={heroMedia.alt || "Hero background"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: mediaOpacity }}
          loading="eager"
        />
      ) : null}
      <div className="relative z-10 space-y-3">
        <div className="text-4xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
          {headline}
        </div>
        <div className="text-base" style={{ color: visualSystem.color.muted }}>
          {subhead}
        </div>
      </div>
    </div>
  );`,
)}`,
  },
  valueProps: {
    fileName: "ValueProps.tsx",
    componentName: "ValueProps",
    code: `${sharedImports}
${withProps(
  "ValueProps",
  `  const items = Array.isArray(content?.items) ? content.items : [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {item?.title || "Value title"}
          </div>
          {item?.description ? (
            <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
              {item.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  proofMetrics: {
    fileName: "ProofMetrics.tsx",
    componentName: "ProofMetrics",
    code: `${sharedImports}
${withProps(
  "ProofMetrics",
  `  const metrics = Array.isArray(content?.metrics) ? content.metrics : [];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {metrics.map((metric: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-2xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {metric?.value || "—"}
          </div>
          <div className="text-sm" style={{ color: visualSystem.color.muted }}>
            {metric?.label || "Performance metric"}
          </div>
          {metric?.context ? (
            <div className="mt-2 text-xs" style={{ color: visualSystem.color.muted }}>
              {metric.context}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  logoCloud: {
    fileName: "LogoCloud.tsx",
    componentName: "LogoCloud",
    code: `${sharedImports}
${withProps(
  "LogoCloud",
  `  const intro = content?.intro || "Selected partners";
  const orgs = Array.isArray(content?.organizations) ? content.organizations : [];
  return (
    <div className="space-y-3">
      <div className="text-sm" style={{ color: visualSystem.color.muted }}>
        {intro}
      </div>
      <div className="flex flex-wrap gap-2">
        {orgs.map((org: string, index: number) => (
          <span key={index} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: visualSystem.color.surface }}>
            {org}
          </span>
        ))}
      </div>
    </div>
  );`,
)}`,
  },
  testimonialStack: {
    fileName: "TestimonialStack.tsx",
    componentName: "TestimonialStack",
    code: `${sharedImports}
${withProps(
  "TestimonialStack",
  `  const testimonials = Array.isArray(content?.testimonials) ? content.testimonials : [];
  return (
    <div className="grid gap-4">
      {testimonials.map((item: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-sm italic">"{item?.quote || "Client testimonial goes here"}"</div>
          <div className="mt-2 text-xs" style={{ color: visualSystem.color.muted }}>
            {item?.attribution || "Client name"}
            {item?.role ? \` · \${item.role}\` : ""}
          </div>
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  caseGrid: {
    fileName: "CaseGrid.tsx",
    componentName: "CaseGrid",
    code: `${sharedImports}
${withProps(
  "CaseGrid",
  `  const intro = content?.intro || "Selected work";
  const items = Array.isArray(content?.items) ? content.items : [];
  return (
    <div className="space-y-4">
      <div className="text-sm" style={{ color: visualSystem.color.muted }}>
        {intro}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
            <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
              {item?.title || "Project title"}
            </div>
            <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
              {item?.outcome || "Describe the outcome delivered"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );`,
)}`,
  },
  caseFeatured: {
    fileName: "CaseFeatured.tsx",
    componentName: "CaseFeatured",
    code: `${sharedImports}
${withProps(
  "CaseFeatured",
  `  const title = content?.title || "Featured case study";
  const summary = content?.summary || "Add a short summary of the engagement.";
  const outcome = content?.outcome || "Describe the outcome delivered";
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: visualSystem.color.surface }}>
      <div className="text-lg font-semibold" style={{ fontFamily: fontFamilies.heading }}>
        {title}
      </div>
      <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
        {summary}
      </div>
      <div className="mt-4 text-sm font-semibold">
        Outcome: {outcome}
      </div>
    </div>
  );`,
)}`,
  },
  processSteps: {
    fileName: "ProcessSteps.tsx",
    componentName: "ProcessSteps",
    code: `${sharedImports}
${withProps(
  "ProcessSteps",
  `  const steps = Array.isArray(content?.steps) ? content.steps : [];
  return (
    <div className="grid gap-4">
      {steps.map((step: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {index + 1}. {step?.title || "Process step"}
          </div>
          {step?.description ? (
            <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
              {step.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  serviceList: {
    fileName: "ServiceList.tsx",
    componentName: "ServiceList",
    code: `${sharedImports}
${withProps(
  "ServiceList",
  `  const services = Array.isArray(content?.services) ? content.services : [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {services.map((service: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {service?.name || "Service name"}
          </div>
          {service?.description ? (
            <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
              {service.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  pricingTable: {
    fileName: "PricingTable.tsx",
    componentName: "PricingTable",
    code: `${sharedImports}
${withProps(
  "PricingTable",
  `  const tiers = Array.isArray(content?.tiers) ? content.tiers : [];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="flex items-center justify-between text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            <span>{tier?.name || "Plan"}</span>
            <span>{tier?.price || "Price"}</span>
          </div>
          {tier?.description ? (
            <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
              {tier.description}
            </div>
          ) : null}
          <ul className="mt-3 space-y-1 text-sm" style={{ color: visualSystem.color.muted }}>
            {(tier?.features || []).map((feature: string, featureIndex: number) => (
              <li key={featureIndex}>{feature}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  faq: {
    fileName: "FAQ.tsx",
    componentName: "FAQ",
    code: `${sharedImports}
${withProps(
  "FAQ",
  `  const questions = Array.isArray(content?.questions) ? content.questions : [];
  return (
    <div className="grid gap-4">
      {questions.map((item: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {item?.question || "Question"}
          </div>
          <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
            {item?.answer || "Answer goes here."}
          </div>
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  timeline: {
    fileName: "Timeline.tsx",
    componentName: "Timeline",
    code: `${sharedImports}
${withProps(
  "Timeline",
  `  const events = Array.isArray(content?.events) ? content.events : [];
  return (
    <div className="grid gap-4">
      {events.map((event: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {event?.label || "Milestone"}
          </div>
          <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
            {event?.description || "Describe the milestone."}
          </div>
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  bioLong: {
    fileName: "BioLong.tsx",
    componentName: "BioLong",
    code: `${sharedImports}
${withProps(
  "BioLong",
  `  const body = content?.body || "Add a narrative bio that explains your approach.";
  return (
    <div className="text-base" style={{ color: visualSystem.color.muted, fontFamily: fontFamilies.body, whiteSpace: "pre-wrap" }}>
      {body}
    </div>
  );`,
)}`,
  },
  values: {
    fileName: "Values.tsx",
    componentName: "Values",
    code: `${sharedImports}
${withProps(
  "Values",
  `  const values = Array.isArray(content?.values) ? content.values : [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {values.map((item: any, index: number) => (
        <div key={index} className="rounded-xl border p-4" style={{ borderColor: visualSystem.color.surface }}>
          <div className="text-base font-semibold" style={{ fontFamily: fontFamilies.heading }}>
            {item?.name || "Value"}
          </div>
          <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
            {item?.description || "Describe the value."}
          </div>
        </div>
      ))}
    </div>
  );`,
)}`,
  },
  ctaPrimary: {
    fileName: "CTAPrimary.tsx",
    componentName: "CTAPrimary",
    code: `${sharedImports}
${withProps(
  "CTAPrimary",
  `  const headline = content?.headline || "Ready to start?";
  const action = content?.actionLabel || "Get in touch";
  return (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: visualSystem.color.surface }}>
      <div className="text-2xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
        {headline}
      </div>
      <button
        className="mt-4 inline-flex items-center rounded-full border px-4 py-2 text-sm"
        style={{ borderColor: visualSystem.color.primary, color: visualSystem.color.primary }}
      >
        {action}
      </button>
    </div>
  );`,
)}`,
  },
  ctaSecondary: {
    fileName: "CTASecondary.tsx",
    componentName: "CTASecondary",
    code: `${sharedImports}
${withProps(
  "CTASecondary",
  `  const headline = content?.headline || "Explore more";
  const action = content?.actionLabel || "Contact";
  return (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: visualSystem.color.surface }}>
      <div className="text-xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
        {headline}
      </div>
      <button
        className="mt-4 inline-flex items-center rounded-full border px-4 py-2 text-sm"
        style={{ borderColor: visualSystem.color.muted, color: visualSystem.color.muted }}
      >
        {action}
      </button>
    </div>
  );`,
)}`,
  },
  contactForm: {
    fileName: "ContactForm.tsx",
    componentName: "ContactForm",
    code: `${sharedImports}
${withProps(
  "ContactForm",
  `  const headline = content?.headline || "Start a conversation";
  const description = content?.description || "Share a few details and I will follow up.";
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: visualSystem.color.surface }}>
      <div className="text-xl font-semibold" style={{ fontFamily: fontFamilies.heading }}>
        {headline}
      </div>
      <div className="mt-2 text-sm" style={{ color: visualSystem.color.muted }}>
        {description}
      </div>
      <div className="mt-4 rounded-xl border border-dashed p-6 text-sm" style={{ borderColor: visualSystem.color.surface }}>
        Contact form fields
      </div>
    </div>
  );`,
)}`,
  },
  blogIndex: {
    fileName: "BlogIndex.tsx",
    componentName: "BlogIndex",
    code: `${sharedImports}
${withProps(
  "BlogIndex",
  `  const intro = content?.intro || "Blog introduction";
  return (
    <div className="text-base" style={{ color: visualSystem.color.muted }}>
      {intro}
    </div>
  );`,
)}`,
  },
  postList: {
    fileName: "PostList.tsx",
    componentName: "PostList",
    code: `${sharedImports}
${withProps(
  "PostList",
  `  const intro = content?.intro || "Post list introduction";
  return (
    <div className="text-base" style={{ color: visualSystem.color.muted }}>
      {intro}
    </div>
  );`,
)}`,
  },
};

export const getSectionTemplate = (sectionId: string) => SECTION_COMPONENT_TEMPLATES[sectionId] || null;
