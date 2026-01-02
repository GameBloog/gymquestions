import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts", "test/**/*.test.ts"],
    exclude: ["test/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "prisma/",
        "test/",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/types/",
        "src/infraestructure/database/prisma.ts",
        "src/server.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
