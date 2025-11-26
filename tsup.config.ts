import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
})
