import type { StyleSpecification } from "maplibre-gl";

/** The key of the metadata of a style where Map Jr. GL reads the images of the style. */
export const STYLE_IMAGES_KEY = "map-jr:images";

export type StyleImage = {
  name: string
  /** The slots (`{{name}}`) of the image when it is an SVG template, in the order of their first use. */
  slots: string[]
};

/** The same pattern as Map Jr. GL uses for a slot. */
const SLOT = /\{\{\s*([\w-]+)\s*\}\}/g;

/** The text of an image entry: an SVG document, a URL, or `{image, width, height, ...}` with such a text as `image`. */
function imageText(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && typeof (entry as {image?: unknown}).image === "string") {
    return (entry as {image: string}).image;
  }
  return undefined;
}

/** The slots of an image entry. An entry that is not an SVG document has none. */
export function imageSlots(entry: unknown): string[] {
  const text = imageText(entry);
  if (!text || !text.trimStart().startsWith("<")) return [];
  return [...new Set([...text.matchAll(SLOT)].map(match => match[1]))];
}

/** The images of `metadata["map-jr:images"]` of the style, by name. */
export function styleImages(style: StyleSpecification | undefined): StyleImage[] {
  const images = (style?.metadata as Record<string, unknown> | undefined)?.[STYLE_IMAGES_KEY];
  if (!images || typeof images !== "object" || Array.isArray(images)) return [];
  return Object.entries(images).map(([name, entry]) => ({ name, slots: imageSlots(entry) }));
}

/**
 * The suggestions of an image field (`icon-image` and the patterns) as `[name, label]`: first the images of the style,
 * whose label names the slots that `params` can fill, then the images of the sprite that the style does not have.
 */
export function imageSuggestions(style: StyleSpecification | undefined, spriteIcons: string[]): [string, string][] {
  const images = styleImages(style);
  const names = new Set(images.map(image => image.name));
  return [
    ...images.map(({name, slots}): [string, string] => [name, slots.length ? `${name} (params: ${slots.join(", ")})` : name]),
    ...spriteIcons.filter(icon => !names.has(icon)).map((icon): [string, string] => [icon, icon]),
  ];
}
