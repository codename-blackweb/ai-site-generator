import type { SiteMedia } from "../media";

type MediaRole = "hero" | "section" | "background";

type MediaKind = "image" | "video";

type MediaStatus = "placeholder" | "generated" | "user";

export type MediaAsset = {
  id: string;
  role: MediaRole;
  kind: MediaKind;
  src: string;
  poster?: string;
  alt?: string;
  caption?: string;
  status: MediaStatus;
};

export type ExportedSiteMedia = {
  assets: MediaAsset[];
};

export const writeSiteMedia = (media: SiteMedia) => `export type MediaRole = "hero" | "section" | "background";
export type MediaKind = "image" | "video";
export type MediaStatus = "placeholder" | "generated" | "user";

export type MediaAsset = {
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
  assets: MediaAsset[];
};

export const siteMedia: SiteMedia = ${JSON.stringify(media, null, 2)};

export const getMediaById = (id: string | null | undefined) =>
  siteMedia.assets.find((asset) => asset.id === id) ?? null;

export const getMediaByRole = (role: MediaRole) =>
  siteMedia.assets.find((asset) => asset.role === role) ?? null;

export const getHeroMedia = () => getMediaByRole("hero");
export const getSectionMedia = () => getMediaByRole("section");
export const getBackgroundMedia = () => getMediaByRole("background");
`;
