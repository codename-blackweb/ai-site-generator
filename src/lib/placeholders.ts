export const placeholderPatterns: RegExp[] = [
  /^-$/,
  /^—$/,
  /^tbd$/i,
  /^untitled/i,
  /replace with/i,
  /add a real/i,
  /insert real/i,
  /placeholder/i,
  /performance metric/i,
  /describe the outcome/i,
  /project details/i,
  /client testimonial/i,
  /visual example/i,
  /confidential/i,
  /blog introduction/i,
  /post list introduction/i,
];

export const isPlaceholderText = (value: unknown) => {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  return placeholderPatterns.some((pattern) => pattern.test(text));
};
