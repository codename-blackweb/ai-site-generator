import type { VisualSystem } from "../visualSystem";

const resolveFontFamily = (label: string) => {
  switch (label) {
    case "High-contrast serif":
      return "\"Playfair Display\", \"Times New Roman\", serif";
    case "Neutral grotesk":
      return "\"Inter\", \"Helvetica Neue\", Arial, sans-serif";
    case "Modern grotesk":
      return "\"Inter\", \"Helvetica Neue\", Arial, sans-serif";
    case "Humanist sans":
      return "\"Source Sans Pro\", Arial, sans-serif";
    case "System sans":
      return "system-ui, -apple-system, \"Segoe UI\", sans-serif";
    default:
      return "system-ui, -apple-system, \"Segoe UI\", sans-serif";
  }
};

export const writeVisualSystem = (visualSystem: VisualSystem) => {
  const headingFamily = resolveFontFamily(visualSystem.typography.headingFont.family);
  const bodyFamily = resolveFontFamily(visualSystem.typography.bodyFont.family);

  return `export const visualSystem = ${JSON.stringify(visualSystem, null, 2)};

export const fontFamilies = {
  heading: ${JSON.stringify(headingFamily)},
  body: ${JSON.stringify(bodyFamily)}
};

export type VisualSystem = typeof visualSystem;
`;
};
