import { beforeEach, describe, test } from "./utils/fixtures";
import { MaputnikDriver } from "./maputnik-driver";

describe("map", () => {
  const { given, get, when, then } = new MaputnikDriver();

  beforeEach(async () => {
    await given.setupMockBackedResponses();
    await when.setStyle("both");
  });

  describe("zoom level", () => {
    test("via url", async () => {
      const zoomLevel = 12.37;
      await when.setStyle("geojson", zoomLevel);
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldBeVisible();
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldContainText("Zoom: " + zoomLevel);
    });

    test("via map controls", async () => {
      const zoomLevel = 12.37;
      await when.setStyle("geojson", zoomLevel);
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldBeVisible();
      await when.clickZoomIn();
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldContainText("Zoom: " + (zoomLevel + 1));
    });

    test("via style file definition", async () => {
      await when.setStyle("zoom_7_center_0_51");
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldBeVisible();
      await then(get.elementByTestId("maplibre:ctrl-zoom")).shouldContainText("Zoom: " + 7);
      await then(get.locationHash()).shouldInclude("#7/51/0");

      // opening another stylefile does not update the map view again
      // as discussed in https://github.com/maplibre/maputnik/issues/1546
      await when.openASecondStyleWithDifferentZoomAndCenter();
      await then(get.locationHash()).shouldInclude("#7/51/0");
    });
  });

  describe("search", () => {
    test("should exist", async () => {
      await then(get.searchControl()).shouldBeVisible();
    });
  });

  describe("popup", () => {
    beforeEach(async () => {
      await when.setStyle("rectangles");
      await then(get.locationHash()).shouldExist();
    });

    test("should open on feature click", async () => {
      await when.clickCenter("maplibre:map");
      await then(get.elementByTestId("feature-layer-popup")).shouldBeVisible();
    });

    test("should open a second feature after closing popup", async () => {
      await when.clickCenter("maplibre:map");
      await then(get.elementByTestId("feature-layer-popup")).shouldBeVisible();
      await when.closePopup();
      await then(get.elementByTestId("feature-layer-popup")).shouldNotExist();
      await when.clickCenter("maplibre:map");
      await then(get.elementByTestId("feature-layer-popup")).shouldBeVisible();
    });
  });

  describe("layer watcher", () => {
    beforeEach(async () => {
      await given.recordConsoleMessages();
      await when.setStyle("vector_tiles");
    });

    test("finds the properties of the features in the vector tiles and awaits querySourceFeatures", async () => {
      await when.click("layer-list-item:places");
      await when.addFilter();
      await when.typeFilterProperty("cl");
      await then(get.element(".maputnik-autocomplete-menu-item")).shouldContainText("class");
      // Map Jr. GL writes a warning when the result of querySourceFeatures is used without await.
      await then(get.consoleMessages()).shouldNotInclude("querySourceFeatures");
    });
  });

  describe("global state", () => {
    beforeEach(async () => {
      await when.setStyle("color_scheme");
    });

    test("a value set in the Global State panel reaches the preview", async () => {
      // The background of color-scheme-style.json is white for "light" and black for "dark".
      await then(get.centerPixelColor("maplibre:map")).shouldEqual("255,255,255");
      await when.click("nav:global-state");
      await when.setValue("global-state-variable-value:0", "dark");
      await when.typeKeys("{enter}");
      await when.modal.close("modal:global-state");
      await then(get.styleFromLocalStorage()).shouldDeepNestedInclude({
        state: { "color-scheme": { default: "dark" } },
      });
      await then(get.centerPixelColor("maplibre:map")).shouldEqual("0,0,0");
    });
  });
});
