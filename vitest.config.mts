import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      // `server-only` throws outside a Next.js server bundle; tests import server modules directly.
      "server-only": r("./test/stubs/server-only.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
