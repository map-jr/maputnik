import { describe, it, expect } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { imageSlots, imageSuggestions, styleImages } from "./style-images";

const style = (images: unknown) => ({
  version: 8,
  metadata: { "map-jr:images": images },
  sources: {},
  layers: [],
}) as unknown as StyleSpecification;

describe("imageSlots", () => {
  it("reads the slots of an SVG template once each", () => {
    expect(imageSlots("<svg><path fill=\"{{color}}\" stroke=\"{{ stroke-color }}\"/><rect fill=\"{{color}}\"/></svg>"))
      .toEqual(["color", "stroke-color"]);
  });

  it("reads the slots of an entry with width and height", () => {
    expect(imageSlots({ image: "<svg fill=\"{{background}}\"/>", width: 20, height: 20 })).toEqual(["background"]);
  });

  it("finds no slots in a URL or an SVG without slots", () => {
    expect(imageSlots("https://example.com/{{color}}.png")).toEqual([]);
    expect(imageSlots("<svg/>")).toEqual([]);
    expect(imageSlots(42)).toEqual([]);
  });
});

describe("styleImages", () => {
  it("lists the images of metadata[\"map-jr:images\"]", () => {
    expect(styleImages(style({ pin: "<svg fill=\"{{color}}\"/>", logo: "https://example.com/logo.png" }))).toEqual([
      { name: "pin", slots: ["color"] },
      { name: "logo", slots: [] },
    ]);
  });

  it("lists nothing for a style without images", () => {
    expect(styleImages({ version: 8, sources: {}, layers: [] })).toEqual([]);
    expect(styleImages(style(["pin"]))).toEqual([]);
  });
});

describe("imageSuggestions", () => {
  it("names the slots of a template and adds the sprite icons that the style does not have", () => {
    expect(imageSuggestions(style({ pin: "<svg fill=\"{{color}}\"/>", dot: "<svg/>" }), ["dot", "bus"])).toEqual([
      ["pin", "pin (params: color)"],
      ["dot", "dot"],
      ["bus", "bus"],
    ]);
  });
});
