import { setWorkerUrl } from "maplibre-gl";

// Map Jr. GL finds its worker file itself. MapLibre GL JS needs the URL of its worker.
if (__MAPLIBRE__) {
  const { default: workerUrl } = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url");
  setWorkerUrl(workerUrl);
}
