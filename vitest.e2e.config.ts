import { defineConfig } from "vitest/config"
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: ".env.test" })

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/e2e/**/*.spec.ts", "test/e2e/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
