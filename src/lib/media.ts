import type { DesignIntent } from "./designIntent";

export type MediaRole = "hero" | "section" | "background";
export type MediaKind = "image" | "video";
export type MediaStatus = "placeholder" | "generated" | "user";

export type SiteMediaAsset = {
  id: string;
  role: MediaRole;
  kind: MediaKind;
  src: string;
  poster?: string;
  alt?: string;
  caption?: string;
  status: MediaStatus;
};

export type SiteMedia = {
  assets: SiteMediaAsset[];
};

type MediaPreset = {
  id: string;
  role: MediaRole;
  kind: MediaKind;
  src: string;
  poster?: string;
  temperature: DesignIntent["emotionalTemperature"];
  prestige: DesignIntent["prestigeLevel"] | "any";
  gravity: DesignIntent["visualGravity"] | "any";
};

const PREMIUM_PRESETS: MediaPreset[] = [
  {
    id: "hero-cool-lux",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-cool-lux.svg",
    temperature: "cool",
    prestige: "luxury",
    gravity: "any",
  },
  {
    id: "hero-cool-pro",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-cool-pro.svg",
    temperature: "cool",
    prestige: "professional",
    gravity: "any",
  },
  {
    id: "hero-neutral-lux",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-neutral-lux.svg",
    temperature: "neutral",
    prestige: "luxury",
    gravity: "any",
  },
  {
    id: "hero-neutral-pro",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-neutral-pro.svg",
    temperature: "neutral",
    prestige: "professional",
    gravity: "any",
  },
  {
    id: "hero-warm-lux",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-warm-lux.svg",
    temperature: "warm",
    prestige: "luxury",
    gravity: "any",
  },
  {
    id: "hero-warm-pro",
    role: "hero",
    kind: "image",
    src: "/media/premium/hero-warm-pro.svg",
    temperature: "warm",
    prestige: "professional",
    gravity: "any",
  },
  {
    id: "texture-cool",
    role: "background",
    kind: "image",
    src: "/media/premium/texture-cool.svg",
    temperature: "cool",
    prestige: "any",
    gravity: "any",
  },
  {
    id: "texture-neutral",
    role: "background",
    kind: "image",
    src: "/media/premium/texture-neutral.svg",
    temperature: "neutral",
    prestige: "any",
    gravity: "any",
  },
  {
    id: "texture-warm",
    role: "background",
    kind: "image",
    src: "/media/premium/texture-warm.svg",
    temperature: "warm",
    prestige: "any",
    gravity: "any",
  },
  {
    id: "section-cool",
    role: "section",
    kind: "image",
    src: "/media/premium/section-cool.svg",
    temperature: "cool",
    prestige: "any",
    gravity: "any",
  },
  {
    id: "section-neutral",
    role: "section",
    kind: "image",
    src: "/media/premium/section-neutral.svg",
    temperature: "neutral",
    prestige: "any",
    gravity: "any",
  },
  {
    id: "section-warm",
    role: "section",
    kind: "image",
    src: "/media/premium/section-warm.svg",
    temperature: "warm",
    prestige: "any",
    gravity: "any",
  },
];

const pickPreset = (role: MediaRole, intent: DesignIntent) => {
  const candidates = PREMIUM_PRESETS.filter(
    (preset) =>
      preset.role === role &&
      preset.temperature === intent.emotionalTemperature &&
      (preset.prestige === intent.prestigeLevel || preset.prestige === "any") &&
      (preset.gravity === intent.visualGravity || preset.gravity === "any"),
  );

  if (candidates.length > 0) {
    return candidates[0];
  }

  return PREMIUM_PRESETS.find((preset) => preset.role === role) ?? null;
};

const buildAsset = (preset: MediaPreset, roleOverride?: MediaRole): SiteMediaAsset => ({
  id: preset.id,
  role: roleOverride ?? preset.role,
  kind: preset.kind,
  src: preset.src,
  poster: preset.poster,
  alt: "Abstract visual placeholder",
  caption: "Replace with project imagery",
  status: "placeholder",
});

export const generateSiteMedia = (intent: DesignIntent): SiteMedia => {
  const assets: SiteMediaAsset[] = [];

  const heroPreset = pickPreset("hero", intent);
  if (heroPreset) {
    assets.push(buildAsset(heroPreset, "hero"));
  }

  const sectionPreset = pickPreset("section", intent);
  if (sectionPreset) {
    assets.push(buildAsset(sectionPreset, "section"));
  }

  const backgroundPreset = pickPreset("background", intent);
  if (backgroundPreset) {
    assets.push(buildAsset(backgroundPreset, "background"));
  }

  return { assets };
};

export const getMediaAsset = (media: SiteMedia | null | undefined, role: MediaRole) =>
  media?.assets.find((asset) => asset.role === role) ?? null;
