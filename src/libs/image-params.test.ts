import { describe, it, expect } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { stripImageParams } from "./image-params";

const style = (layout: Record<string, unknown>, paint: Record<string, unknown> = {}) => ({
  version: 8,
  sources: {},
  layers: [{ id: "s", type: "symbol", source: "x", layout, paint }],
}) as unknown as StyleSpecification;

describe("stripImageParams", () => {
  it("removes params from icon-image", () => {
    const out = stripImageParams(style({ "icon-image": ["image", "pin", { params: { color: "#f00" } }] }));
    expect((out.layers[0] as any).layout["icon-image"]).toEqual(["image", "pin"]);
  });

  it("removes params inside other expressions and format sections", () => {
    const out = stripImageParams(style({
      "icon-image": ["case", ["has", "x"], ["image", ["concat", ["get", "class"], "_11"], { params: { color: "#fff" } }], ""],
      "text-field": ["format", ["image", "shield", { params: { color: "#000" } }], {}, "A1", {}],
    }));
    const layout = (out.layers[0] as any).layout;
    expect(layout["icon-image"]).toEqual(["case", ["has", "x"], ["image", ["concat", ["get", "class"], "_11"]], ""]);
    expect(layout["text-field"]).toEqual(["format", ["image", "shield"], {}, "A1", {}]);
  });

  it("does not add paint or layout to a layer that has none", () => {
    const input = {
      version: 8,
      sources: {},
      layers: [{ id: "s", type: "symbol", source: "x", layout: { "icon-image": ["image", "pin", { params: { color: "#f00" } }] } }],
    } as unknown as StyleSpecification;
    const layer = stripImageParams(input).layers[0];
    expect("paint" in layer).toBe(false);
    expect(Object.keys(layer)).toEqual(["id", "type", "source", "layout"]);
  });

  it("does not change the style that it is given", () => {
    const input = style({ "icon-image": ["image", "pin", { params: { color: "#f00" } }] });
    const copy = JSON.parse(JSON.stringify(input));
    stripImageParams(input);
    expect(input).toEqual(copy);
  });

  it("returns the same object when no image has params", () => {
    const input = style({ "icon-image": ["image", "pin"] }, { "icon-color": "#000" });
    expect(stripImageParams(input)).toBe(input);
  });
});
