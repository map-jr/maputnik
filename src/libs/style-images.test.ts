import { describe, it, expect } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { imageSlots, imageSuggestions, paramsSlotErrors, removeStyleImage, setStyleImage, styleImages, styleImageText } from "./style-images";

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

describe("paramsSlotErrors", () => {
  const withLayout = (layout: Record<string, unknown>, images: unknown = { pin: "<svg fill=\"{{color}}\" stroke=\"{{stroke}}\"/>" }) => ({
    version: 8,
    metadata: { "map-jr:images": images },
    sources: {},
    layers: [{ id: "a", type: "background" }, { id: "s", type: "symbol", source: "x", layout }],
  }) as unknown as StyleSpecification;

  it("names the layer, the image and the key that is not a slot", () => {
    expect(paramsSlotErrors(withLayout({ "icon-image": ["image", "pin", { params: { colour: "#f00", stroke: "#fff" } }] }))).toEqual([
      { index: 1, key: "layout.icon-image", message: "params \"colour\" is not a slot of the image \"pin\". Its slots are \"color\", \"stroke\"." },
    ]);
  });

  it("finds an image expression inside another expression", () => {
    const errors = paramsSlotErrors(withLayout({
      "icon-image": ["case", ["has", "x"], ["image", "pin", { params: { colour: "#f00" } }], ""],
    }));
    expect(errors.map(error => error.message)).toEqual(["params \"colour\" is not a slot of the image \"pin\". Its slots are \"color\", \"stroke\"."]);
  });

  it("reports every key of an image without slots", () => {
    const errors = paramsSlotErrors(withLayout({ "icon-image": ["image", "pin", { params: { color: "#f00" } }] }, { pin: { image: "<svg/>", width: 10, height: 10 } }));
    expect(errors.map(error => error.message)).toEqual(["params \"color\" is not a slot of the image \"pin\". The image has no slots."]);
  });

  it("checks nothing when the slots are right or not known", () => {
    expect(paramsSlotErrors(withLayout({ "icon-image": ["image", "pin", { params: { color: "#f00" } }] }))).toEqual([]);
    expect(paramsSlotErrors(withLayout({ "icon-image": ["image", "sprite-icon", { params: { colour: "#f00" } }] }))).toEqual([]);
    expect(paramsSlotErrors(withLayout({ "icon-image": ["image", ["get", "name"], { params: { colour: "#f00" } }] }))).toEqual([]);
    expect(paramsSlotErrors(withLayout({ "icon-image": ["image", "pin", { params: { colour: "#f00" } }] }, { pin: "https://example.com/pin.png" }))).toEqual([]);
  });
});

describe("setStyleImage and removeStyleImage", () => {
  it("adds an image and keeps the other images and metadata", () => {
    const input = { ...style({ pin: "<svg/>" }), metadata: { "map-jr:images": { pin: "<svg/>" }, "maputnik:renderer": "mlgljs" } } as unknown as StyleSpecification;
    const out = setStyleImage(input, "dot", "<svg id=\"dot\"/>");
    expect(out.metadata).toEqual({ "map-jr:images": { pin: "<svg/>", dot: "<svg id=\"dot\"/>" }, "maputnik:renderer": "mlgljs" });
    expect((input.metadata as any)["map-jr:images"]).toEqual({ pin: "<svg/>" });
  });

  it("adds the first image to a style without metadata", () => {
    const out = setStyleImage({ version: 8, sources: {}, layers: [] } as StyleSpecification, "dot", "<svg/>");
    expect(out.metadata).toEqual({ "map-jr:images": { dot: "<svg/>" } });
  });

  it("replaces the text of an entry with width and height and keeps its fields", () => {
    const out = setStyleImage(style({ pin: { image: "<svg/>", width: 10, height: 10 } }), "pin", "<svg id=\"new\"/>");
    expect((out.metadata as any)["map-jr:images"].pin).toEqual({ image: "<svg id=\"new\"/>", width: 10, height: 10 });
    expect(styleImageText(out, "pin")).toBe("<svg id=\"new\"/>");
  });

  it("removes an image, and the key when no image is left", () => {
    const two = style({ pin: "<svg/>", dot: "<svg/>" });
    expect((removeStyleImage(two, "pin").metadata as any)["map-jr:images"]).toEqual({ dot: "<svg/>" });
    expect(removeStyleImage(style({ pin: "<svg/>" }), "pin").metadata).toEqual({});
  });
});
