import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 30_000 },
  reporter: "line",
  outputDir: join(tmpdir(), "yori-playwright-results"),
  use: { baseURL: "http://127.0.0.1:3207", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3207",
    url: "http://127.0.0.1:3207",
    env: {
      ...process.env,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-only-auth-secret-0000000000",
      AUTH_BASE_URL: "http://127.0.0.1:3207",
    },
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
