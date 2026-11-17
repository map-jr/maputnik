import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";

// The map preview renders with Map Jr. GL: `maplibre-gl` is its compat entry, which has the API of MapLibre GL JS.
// MAPUTNIK_RENDERER=maplibre builds with MapLibre GL JS, for a comparison of the two.
const maplibre = process.env.MAPUTNIK_RENDERER === "maplibre";

export default defineConfig(({ mode }) => ({
  server: {
    port: 8888,
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      checks: { invalidAnnotation: false },
    },
  },
  plugins: [
    react(),
    istanbul({
      requireEnv: false,
      nycrcPath: "./.nycrc.json",
      forceBuildInstrument: true, // Instrument the source so e2e runs can collect coverage
    }),
  ],
  resolve: maplibre ? {} : {
    alias: [
      { find: /^maplibre-gl$/, replacement: "@map-jr/map-jr-gl/maplibre-compat" },
      // Map Jr. GL brings its own CSS; the CSS of MapLibre GL JS would style its elements a second time.
      { find: /^maplibre-gl\/dist\/maplibre-gl\.css$/, replacement: fileURLToPath(new URL("./src/empty.css", import.meta.url)) },
    ],
  },
  optimizeDeps: {
    // Map Jr. GL finds its worker file next to its own file, which Vite's cache of dependencies does not hold
    // (docs/loading.md of map-jr-gl).
    exclude: maplibre ? ["maplibre-gl/dist/maplibre-gl-worker.mjs"] : ["@map-jr/map-jr-gl", "maplibre-gl"],
  },
  base: mode === "desktop" ? "/" : "/maputnik/",
  define: {
    global: "globalThis",
    __MAPLIBRE__: JSON.stringify(maplibre),
  },
}));
