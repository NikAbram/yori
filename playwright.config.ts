import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  outputDir: join(tmpdir(), "yori-playwright-results"),
  use: { baseURL: "http://127.0.0.1:3207", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3207",
    url: "http://127.0.0.1:3207",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
