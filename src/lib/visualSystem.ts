import type { DesignIntent } from "./designIntent";

export type ColorSystem = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  muted: string;
  gradient?: {
    from: string;
    to: string;
    angle: number;
  };
};

export type TypographySystem = {
  headingFont: {
    family: string;
    weight: number;
    tracking: number;
  };
  bodyFont: {
    family: string;
    weight: number;
    lineHeight: number;
  };
  scale: "compact" | "editorial" | "dramatic";
};

export type SpacingSystem = {
  baseUnit: number;
  sectionPadding: number;
  contentMaxWidth: number;
};

export type MotionSystem = {
  easing: "linear" | "easeOut" | "spring";
  durationScale: number;
  revealStyle: "fade" | "slide" | "parallax" | "none";
};

export type VisualSystem = {
  color: ColorSystem;
  typography: TypographySystem;
  spacing: SpacingSystem;
  motion: MotionSystem;
};

const backgroundMap = {
  luxury: {
    cool: "#0b0c10",
    neutral: "#101113",
    warm: "#14110f",
  },
  professional: {
    light: "#f6f5f2",
    dark: "#14161a",
  },
  utilitarian: {
    base: "#ffffff",
  },
} as const;

const primaryMap = {
  cool: "#1d4ed8",
  neutral: "#334155",
  warm: "#f97316",
} as const;

const accentMap = {
  cool: "#0ea5e9",
  neutral: "#ef4444",
  warm: "#e11d48",
} as const;

const mutedMap = {
  light: "#64748b",
  dark: "#6b7280",
} as const;

const surfaceMap = {
  light: "#ffffff",
  neutralLight: "#f8fafc",
  dark: "#111827",
  neutralDark: "#1f2937",
} as const;

const deriveColor = (intent: DesignIntent): ColorSystem => {
  let background = backgroundMap.utilitarian.base;
  if (intent.prestigeLevel === "luxury") {
    background = backgroundMap.luxury[intent.emotionalTemperature];
  } else if (intent.prestigeLevel === "professional") {
    background = intent.visualGravity === "minimal" ? backgroundMap.professional.light : backgroundMap.professional.dark;
  }

  const primary = primaryMap[intent.emotionalTemperature];
  const accent = intent.visualGravity === "expressive" ? accentMap[intent.emotionalTemperature] : primary;
  const isLight = background === backgroundMap.utilitarian.base || background === backgroundMap.professional.light;
  const surface = isLight ? surfaceMap.neutralLight : surfaceMap.neutralDark;
  const muted = isLight ? mutedMap.light : mutedMap.dark;
  const gradient =
    intent.visualGravity === "expressive"
      ? {
          from: primary,
          to: accent,
          angle: 135,
        }
      : undefined;

  return {
    background,
    surface,
    primary,
    accent,
    muted,
    gradient,
  };
};

const deriveTypography = (intent: DesignIntent): TypographySystem => {
  const scale =
    intent.visualGravity === "minimal" ? "compact" : intent.visualGravity === "expressive" ? "dramatic" : "editorial";

  if (intent.prestigeLevel === "luxury") {
    return {
      headingFont: {
        family: "High-contrast serif",
        weight: 600,
        tracking: 0.02,
      },
      bodyFont: {
        family: "Neutral grotesk",
        weight: 400,
        lineHeight: 1.6,
      },
      scale,
    };
  }

  if (intent.prestigeLevel === "utilitarian") {
    return {
      headingFont: {
        family: "System sans",
        weight: 600,
        tracking: 0,
      },
      bodyFont: {
        family: "System sans",
        weight: 400,
        lineHeight: 1.5,
      },
      scale,
    };
  }

  return {
    headingFont: {
      family: "Modern grotesk",
      weight: 600,
      tracking: 0.01,
    },
    bodyFont: {
      family: "Humanist sans",
      weight: 400,
      lineHeight: 1.6,
    },
    scale,
  };
};

const deriveSpacing = (intent: DesignIntent): SpacingSystem => {
  const baseUnit = intent.spatialDensity === "airy" ? 8 : intent.spatialDensity === "dense" ? 4 : 6;
  const sectionPadding = baseUnit * (intent.visualGravity === "expressive" ? 10 : 8);
  const contentMaxWidth = intent.prestigeLevel === "luxury" ? 1120 : 960;

  return {
    baseUnit,
    sectionPadding,
    contentMaxWidth,
  };
};

const deriveMotion = (intent: DesignIntent): MotionSystem => {
  const easing = intent.prestigeLevel === "utilitarian" ? "linear" : "easeOut";
  const durationScale = intent.motionEnergy === "still" ? 0 : intent.motionEnergy === "guided" ? 1 : 1.6;

  let revealStyle: MotionSystem["revealStyle"] = "none";
  if (intent.motionEnergy === "guided") {
    revealStyle = "fade";
  } else if (intent.motionEnergy === "cinematic") {
    revealStyle = intent.spatialDensity === "dense" ? "slide" : "parallax";
  }

  return {
    easing,
    durationScale,
    revealStyle,
  };
};

export const generateVisualSystem = (intent: DesignIntent): VisualSystem => ({
  color: deriveColor(intent),
  typography: deriveTypography(intent),
  spacing: deriveSpacing(intent),
  motion: deriveMotion(intent),
});
