import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the Vite dev server in the browser installed on the
 * machine (Google Chrome), so no browser download is needed. Set PW_CHANNEL=msedge
 * (or leave empty for Playwright's bundled Chromium) to change that.
 */
const channel = process.env.PW_CHANNEL === undefined ? 'chrome' : process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  // Traces and screenshots are written outside the project: when the repo lives in a OneDrive-synced
  // folder, the sync client can briefly lock freshly written files (EBUSY) and fail the test teardown.
  outputDir: process.env.PW_OUTPUT_DIR ?? path.join(os.tmpdir(), 'hoomefy-playwright'),
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel,
    // Software GL keeps the WebGL shader path testable on machines without a GPU.
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 800 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], channel },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
