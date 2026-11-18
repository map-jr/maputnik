import { describe, it, expect, vi } from "vitest";
import { LayerWatcher } from "./layerwatcher";
import type { Map } from "maplibre-gl";

function mockMap(): Map {
  return {
    style: {
      tileManagers: {
        vector: { _source: { vectorLayerIds: ["water", "roads"] } },
      },
    },
    querySourceFeatures: () => [
      { properties: { class: "river", name: "A" } },
      { properties: { class: "canal" } },
    ],
  } as unknown as Map;
}

describe("LayerWatcher", () => {
  it("reports sources discovered on the map", () => {
    const onSourcesChange = vi.fn();
    const watcher = new LayerWatcher({ onSourcesChange });

    watcher.analyzeMap(mockMap());
    expect(onSourcesChange).toHaveBeenCalledOnce();
    expect(watcher.sources).toEqual({ vector: ["water", "roads"] });

    // Re-analyzing the same sources does not fire the callback again.
    watcher.analyzeMap(mockMap());
    expect(onSourcesChange).toHaveBeenCalledOnce();
  });

  it("collects vector layer field values from source features", async () => {
    const onVectorLayersChange = vi.fn();
    const watcher = new LayerWatcher({ onVectorLayersChange });

    const map = mockMap();
    watcher.analyzeMap(map); // populates _sources
    await watcher.analyzeVectorLayerFields(map);

    expect(onVectorLayersChange).toHaveBeenCalled();
    expect(watcher.vectorLayers.water.class).toHaveProperty("river");
    expect(watcher.vectorLayers.water.class).toHaveProperty("canal");
    expect(watcher.vectorLayers.water.name).toHaveProperty("A");
  });

  it("awaits the features when querySourceFeatures returns a promise, as Map Jr. GL does", async () => {
    const onVectorLayersChange = vi.fn();
    const watcher = new LayerWatcher({ onVectorLayersChange });

    const map = mockMap();
    const features = [{ properties: { class: "river" } }];
    // Map Jr. GL returns an array that is not complete yet, which is also a promise of the complete result.
    map.querySourceFeatures = (() => Object.assign([], {
      then: (resolve: (value: unknown) => void) => resolve(features),
    })) as unknown as Map["querySourceFeatures"];
    watcher.analyzeMap(map);
    await watcher.analyzeVectorLayerFields(map);

    expect(watcher.vectorLayers.water.class).toHaveProperty("river");
  });
});
