import type { StyleSpecification } from "maplibre-gl";

/**
 * Returns the style without the `params` option of the `image` expression (`["image", name, {"params": {...}}]`).
 *
 * The editor validates styles with a style spec that accepts `params`, the values for the slots of an SVG template in
 * Map Jr. GL. MapLibre GL JS and OpenLayers have their own copy of the style spec, which rejects the third argument,
 * so the preview gets `["image", name]` in its place. Without templates, the preview resolves the image by its name.
 * The style that the editor saves keeps `params`.
 */
export function stripImageParams<T extends StyleSpecification>(style: T): T {
  if (!Array.isArray(style?.layers)) return style;
  let changed = false;
  const strip = (value: unknown): unknown => {
    if (!Array.isArray(value)) return value;
    if (value[0] === "image" && value.length === 3) {
      changed = true;
      return ["image", strip(value[1])];
    }
    let out: unknown[] | undefined;
    value.forEach((item, i) => {
      const next = strip(item);
      if (next !== item) (out ??= value.slice())[i] = next;
    });
    return out ?? value;
  };
  const stripProperties = (properties: Record<string, unknown> | undefined) => {
    if (!properties) return properties;
    let out: Record<string, unknown> | undefined;
    for (const key in properties) {
      const next = strip(properties[key]);
      if (next !== properties[key]) (out ??= {...properties})[key] = next;
    }
    return out ?? properties;
  };
  const layers = style.layers.map(layer => {
    const l = layer as typeof layer & { layout?: Record<string, unknown>, paint?: Record<string, unknown> };
    const layout = stripProperties(l.layout), paint = stripProperties(l.paint);
    if (layout === l.layout && paint === l.paint) return layer;
    // Only the keys that the layer has: MapLibre GL JS rejects `paint: undefined`.
    const out = { ...l };
    if (layout !== l.layout) out.layout = layout;
    if (paint !== l.paint) out.paint = paint;
    return out as typeof layer;
  });
  return changed ? { ...style, layers } : style;
}
