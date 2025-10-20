import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    reporters: ["dot"],
    coverage: { reporter: ["text", "json", "lcov"], enabled: false },
  },
});
