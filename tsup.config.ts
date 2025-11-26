import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
})
