import { defineConfig } from "tsup";

export default defineConfig({
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  outDir: "dist",
  entry: ["src/index.ts"],
  bundle: false,
  treeshake: false,
});
