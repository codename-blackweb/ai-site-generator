export type DesignIntent = {
  visualGravity: "minimal" | "balanced" | "expressive";
  motionEnergy: "still" | "guided" | "cinematic";
  spatialDensity: "airy" | "neutral" | "dense";
  emotionalTemperature: "cool" | "neutral" | "warm";
  prestigeLevel: "utilitarian" | "professional" | "luxury";
};

export type IntentSignals = {
  siteType: "portfolio" | "marketing" | "editorial";
  audienceType: "hiring" | "clients" | "investors" | "general";
  toneAxis: "conservative" | "expressive";
  industry?: "creative" | "tech" | "finance" | "personal";
  mediaHeavy?: boolean;
};

export type IntentMutation = "confirm" | "calmer" | "bolder" | "minimal";

export const MUTATION_PRESETS: Record<Exclude<IntentMutation, "confirm">, Partial<DesignIntent>> =
  {
    calmer: {
      motionEnergy: "guided",
      visualGravity: "balanced",
    },
    bolder: {
      visualGravity: "expressive",
      emotionalTemperature: "warm",
    },
    minimal: {
      visualGravity: "minimal",
      spatialDensity: "airy",
      motionEnergy: "still",
    },
  };

const normalize = (value?: string | null) => (value || "").toLowerCase();

export function deriveIntentSignals(params: {
  purpose?: string | null;
  audience?: string | null;
  toneAxis?: string | null;
  industry?: string | null;
  mediaHeavy?: boolean | null;
}): IntentSignals {
  const purpose = normalize(params.purpose);
  const audience = normalize(params.audience);
  const toneAxis = normalize(params.toneAxis);
  const industry = normalize(params.industry);

  const siteType: IntentSignals["siteType"] = purpose.includes("portfolio")
    ? "portfolio"
    : purpose.includes("editorial") || purpose.includes("blog") || purpose.includes("thought")
      ? "editorial"
      : "marketing";

  const audienceType: IntentSignals["audienceType"] = audience.includes("hiring") ||
    audience.includes("recruit")
    ? "hiring"
    : audience.includes("investor")
      ? "investors"
      : audience.includes("client") || audience.includes("customer") || audience.includes("buyer")
        ? "clients"
        : "general";

  const resolvedToneAxis: IntentSignals["toneAxis"] =
    toneAxis.includes("expressive") ? "expressive" : "conservative";

  const resolvedIndustry: IntentSignals["industry"] | undefined =
    industry.includes("finance")
      ? "finance"
      : industry.includes("creative") || industry.includes("design") || industry.includes("studio")
        ? "creative"
        : industry.includes("tech") || industry.includes("saas")
          ? "tech"
          : industry.includes("personal")
            ? "personal"
            : undefined;

  const mediaHeavy =
    params.mediaHeavy ??
    purpose.includes("portfolio") ||
    purpose.includes("gallery") ||
    purpose.includes("photo") ||
    purpose.includes("video") ||
    purpose.includes("showcase");

  return {
    siteType,
    audienceType,
    toneAxis: resolvedToneAxis,
    industry: resolvedIndustry,
    mediaHeavy,
  };
}

export function inferDesignIntent(signals: IntentSignals): DesignIntent {
  return {
    visualGravity: signals.toneAxis === "expressive" ? "expressive" : "balanced",
    motionEnergy: signals.mediaHeavy || signals.siteType === "portfolio" ? "cinematic" : "guided",
    spatialDensity: signals.audienceType === "hiring" ? "airy" : "neutral",
    emotionalTemperature: signals.industry === "finance" ? "cool" : "neutral",
    prestigeLevel: signals.siteType === "portfolio" ? "luxury" : "professional",
  };
}

export function applyIntentMutation(intent: DesignIntent, mutation: IntentMutation): DesignIntent {
  if (mutation === "confirm") return intent;
  const preset = MUTATION_PRESETS[mutation];
  return { ...intent, ...preset };
}
