import type { ReactElement } from "react";
import { placeholderPatterns } from "@/lib/placeholders";

type SectionPreviewRenderer = (content: unknown) => ReactElement;

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asArray = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);
const joinClasses = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(" ");
const isPlaceholderString = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return false;
  return placeholderPatterns.some((pattern) => pattern.test(text));
};
const textClass = (value: unknown, baseClass?: string) =>
  joinClasses(baseClass, isPlaceholderString(value) ? "opacity-70" : undefined);

const heroEditorial: SectionPreviewRenderer = (content) => {
  const data = content as { headline?: string; subhead?: string; primaryActionLabel?: string };
  return (
    <div className="space-y-2">
      <div className={textClass(data.headline || "Untitled hero", "text-2xl font-semibold")}>
        {asString(data.headline) || "Untitled hero"}
      </div>
      {data.subhead ? (
        <div className={textClass(data.subhead, "text-sm text-muted-foreground")}>{data.subhead}</div>
      ) : null}
      {data.primaryActionLabel ? (
        <button className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
          <span className={textClass(data.primaryActionLabel)}>{data.primaryActionLabel}</span>
        </button>
      ) : null}
    </div>
  );
};

const heroSplit: SectionPreviewRenderer = (content) => {
  const data = content as {
    headline?: string;
    subhead?: string;
    primaryActionLabel?: string;
    secondaryActionLabel?: string;
  };
  return (
    <div className="space-y-2">
      <div className={textClass(data.headline || "Untitled hero", "text-2xl font-semibold")}>
        {asString(data.headline) || "Untitled hero"}
      </div>
      {data.subhead ? (
        <div className={textClass(data.subhead, "text-sm text-muted-foreground")}>{data.subhead}</div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {data.primaryActionLabel ? (
          <button className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
            <span className={textClass(data.primaryActionLabel)}>{data.primaryActionLabel}</span>
          </button>
        ) : null}
        {data.secondaryActionLabel ? (
          <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
            <span className={textClass(data.secondaryActionLabel)}>{data.secondaryActionLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

const heroMinimal: SectionPreviewRenderer = (content) => {
  const data = content as { headline?: string; subhead?: string };
  return (
    <div className="space-y-2">
      <div className={textClass(data.headline || "Untitled hero", "text-2xl font-semibold")}>
        {asString(data.headline) || "Untitled hero"}
      </div>
      {data.subhead ? (
        <div className={textClass(data.subhead, "text-sm text-muted-foreground")}>{data.subhead}</div>
      ) : null}
    </div>
  );
};

const proofMetrics: SectionPreviewRenderer = (content) => {
  const data = content as { metrics?: Array<{ label?: string; value?: string }> };
  const metrics = asArray<{ label?: string; value?: string }>(data.metrics);
  return (
    <div className="grid gap-2">
      {metrics.map((metric, index) => (
        <div key={`${metric.label}-${index}`} className="flex items-center justify-between text-sm">
          <div className={textClass(metric.label, "text-muted-foreground")}>{asString(metric.label)}</div>
          <div className={textClass(metric.value, "font-semibold")}>{asString(metric.value)}</div>
        </div>
      ))}
    </div>
  );
};

const logoCloud: SectionPreviewRenderer = (content) => {
  const data = content as { intro?: string; organizations?: string[] };
  const orgs = asArray<string>(data.organizations);
  return (
    <div className="space-y-2">
      {data.intro ? (
        <div className={textClass(data.intro, "text-sm text-muted-foreground")}>{data.intro}</div>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {orgs.map((org) => (
          <span key={org} className={textClass(org, "rounded-full border border-border px-2 py-1")}>
            {org}
          </span>
        ))}
      </div>
    </div>
  );
};

const testimonialStack: SectionPreviewRenderer = (content) => {
  const data = content as { testimonials?: Array<{ quote?: string; attribution?: string; role?: string }> };
  const testimonials = asArray<{ quote?: string; attribution?: string; role?: string }>(data.testimonials);
  return (
    <div className="space-y-3">
      {testimonials.map((item, index) => (
        <div key={`${item.attribution}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(item.quote, "text-sm italic")}>
            "{asString(item.quote)}"
          </div>
          <div className={textClass(item.attribution, "mt-1 text-xs text-muted-foreground")}>
            {asString(item.attribution)}
            {item.role ? ` · ${item.role}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
};

const caseGrid: SectionPreviewRenderer = (content) => {
  const data = content as { intro?: string; items?: Array<{ title?: string; outcome?: string }> };
  const items = asArray<{ title?: string; outcome?: string }>(data.items);
  return (
    <div className="space-y-2">
      {data.intro ? (
        <div className={textClass(data.intro, "text-sm text-muted-foreground")}>{data.intro}</div>
      ) : null}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
            <div className={textClass(item.title, "text-sm font-semibold")}>{asString(item.title)}</div>
            {item.outcome ? (
              <div className={textClass(item.outcome, "text-xs text-muted-foreground")}>{item.outcome}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const caseFeatured: SectionPreviewRenderer = (content) => {
  const data = content as { title?: string; summary?: string; outcome?: string };
  return (
    <div className="space-y-2 rounded-lg border border-border/60 px-3 py-2">
      <div className={textClass(data.title, "text-sm font-semibold")}>{asString(data.title)}</div>
      {data.summary ? (
        <div className={textClass(data.summary, "text-xs text-muted-foreground")}>{data.summary}</div>
      ) : null}
      {data.outcome ? (
        <div className={joinClasses("text-xs font-semibold", isPlaceholderString(data.outcome) ? "opacity-70" : "")}>
          Outcome: <span className={textClass(data.outcome)}>{data.outcome}</span>
        </div>
      ) : null}
    </div>
  );
};

const valueProps: SectionPreviewRenderer = (content) => {
  const data = content as { items?: Array<{ title?: string; description?: string }> };
  const items = asArray<{ title?: string; description?: string }>(data.items);
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(item.title, "text-sm font-semibold")}>{asString(item.title)}</div>
          {item.description ? (
            <div className={textClass(item.description, "text-xs text-muted-foreground")}>
              {item.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const processSteps: SectionPreviewRenderer = (content) => {
  const data = content as { steps?: Array<{ title?: string; description?: string }> };
  const steps = asArray<{ title?: string; description?: string }>(data.steps);
  return (
    <ol className="space-y-2 text-sm">
      {steps.map((step, index) => (
        <li key={`${step.title}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(step.title, "font-semibold")}>
            {index + 1}. {asString(step.title)}
          </div>
          {step.description ? (
            <div className={textClass(step.description, "text-xs text-muted-foreground")}>{step.description}</div>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

const serviceList: SectionPreviewRenderer = (content) => {
  const data = content as { services?: Array<{ name?: string; description?: string }> };
  const services = asArray<{ name?: string; description?: string }>(data.services);
  return (
    <div className="space-y-2">
      {services.map((service, index) => (
        <div key={`${service.name}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(service.name, "text-sm font-semibold")}>{asString(service.name)}</div>
          {service.description ? (
            <div className={textClass(service.description, "text-xs text-muted-foreground")}>
              {service.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const pricingTable: SectionPreviewRenderer = (content) => {
  const data = content as { tiers?: Array<{ name?: string; price?: string; description?: string; features?: string[] }> };
  const tiers = asArray<{ name?: string; price?: string; description?: string; features?: string[] }>(data.tiers);
  return (
    <div className="grid gap-3">
      {tiers.map((tier, index) => (
        <div key={`${tier.name}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className={textClass(tier.name)}>{asString(tier.name)}</span>
            <span className={textClass(tier.price)}>{asString(tier.price)}</span>
          </div>
          {tier.description ? (
            <div className={textClass(tier.description, "text-xs text-muted-foreground")}>{tier.description}</div>
          ) : null}
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {asArray<string>(tier.features).map((feature) => (
              <li key={feature} className={textClass(feature)}>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const faq: SectionPreviewRenderer = (content) => {
  const data = content as { questions?: Array<{ question?: string; answer?: string }> };
  const questions = asArray<{ question?: string; answer?: string }>(data.questions);
  return (
    <div className="space-y-2">
      {questions.map((item, index) => (
        <div key={`${item.question}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(item.question, "text-sm font-semibold")}>{asString(item.question)}</div>
          {item.answer ? (
            <div className={textClass(item.answer, "text-xs text-muted-foreground")}>{item.answer}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const timeline: SectionPreviewRenderer = (content) => {
  const data = content as { events?: Array<{ label?: string; description?: string }> };
  const events = asArray<{ label?: string; description?: string }>(data.events);
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div key={`${event.label}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(event.label, "text-sm font-semibold")}>{asString(event.label)}</div>
          {event.description ? (
            <div className={textClass(event.description, "text-xs text-muted-foreground")}>{event.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const bioLong: SectionPreviewRenderer = (content) => {
  const data = content as { body?: string };
  return (
    <div className={textClass(data.body, "whitespace-pre-wrap text-sm text-muted-foreground")}>
      {asString(data.body)}
    </div>
  );
};

const values: SectionPreviewRenderer = (content) => {
  const data = content as { values?: Array<{ name?: string; description?: string }> };
  const items = asArray<{ name?: string; description?: string }>(data.values);
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="rounded-lg border border-border/60 px-3 py-2">
          <div className={textClass(item.name, "text-sm font-semibold")}>{asString(item.name)}</div>
          {item.description ? (
            <div className={textClass(item.description, "text-xs text-muted-foreground")}>{item.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const ctaPrimary: SectionPreviewRenderer = (content) => {
  const data = content as { headline?: string; actionLabel?: string };
  return (
    <div className="space-y-2 text-center">
      <div className={textClass(data.headline, "text-lg font-semibold")}>{asString(data.headline)}</div>
      {data.actionLabel ? (
        <button className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
          <span className={textClass(data.actionLabel)}>{data.actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
};

const ctaSecondary: SectionPreviewRenderer = (content) => {
  const data = content as { headline?: string; actionLabel?: string };
  return (
    <div className="space-y-2 text-center">
      <div className={textClass(data.headline, "text-lg font-semibold")}>{asString(data.headline)}</div>
      {data.actionLabel ? (
        <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
          <span className={textClass(data.actionLabel)}>{data.actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
};

const contactForm: SectionPreviewRenderer = (content) => {
  const data = content as { headline?: string; description?: string };
  return (
    <div className="space-y-2">
      <div className={textClass(data.headline, "text-lg font-semibold")}>{asString(data.headline)}</div>
      {data.description ? (
        <div className={textClass(data.description, "text-xs text-muted-foreground")}>{data.description}</div>
      ) : null}
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
        Contact form fields
      </div>
    </div>
  );
};

const blogIndex: SectionPreviewRenderer = (content) => {
  const data = content as { intro?: string };
  const intro = asString(data.intro) || "Blog introduction";
  return <div className={textClass(intro, "text-sm text-muted-foreground")}>{intro}</div>;
};

const postList: SectionPreviewRenderer = (content) => {
  const data = content as { intro?: string };
  const intro = asString(data.intro) || "Post list introduction";
  return <div className={textClass(intro, "text-sm text-muted-foreground")}>{intro}</div>;
};

export const sectionPreviewRenderers: Record<string, SectionPreviewRenderer> = {
  heroEditorial,
  heroSplit,
  heroMinimal,
  proofMetrics,
  logoCloud,
  testimonialStack,
  caseGrid,
  caseFeatured,
  valueProps,
  processSteps,
  serviceList,
  pricingTable,
  faq,
  timeline,
  bioLong,
  values,
  ctaPrimary,
  ctaSecondary,
  contactForm,
  blogIndex,
  postList,
};

export const renderSectionPreview = (sectionId: string, content: unknown) => {
  const renderer = sectionPreviewRenderers[sectionId];
  if (!renderer || !content) return null;
  return renderer(content);
};
