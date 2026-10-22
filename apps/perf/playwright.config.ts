import { defineConfig, devices } from '@playwright/test'

/*
 * Not part of the e2e gate: `bun run perf` is the only way to run these specs.
 *
 * PERF_PORT lets two builds be measured side by side from different checkouts
 * (4501 for the stack, 4502 for the baseline). The server serves the PRODUCTION
 * bundle (`vite build` first), never the dev server.
 *
 * One worker, no parallelism: tests running concurrently would steal CPU from
 * each other and the numbers would measure the machine's scheduler.
 */
const PORT = Number(process.env.PERF_PORT ?? 4501)

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	// A hard cap per scenario x throttle; the slow 500-resource scenarios at 4x need room.
	timeout: 40 * 60_000,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		timezoneId: 'UTC',
		locale: 'en-US',
		colorScheme: 'light',
		viewport: { width: 1280, height: 900 },
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `bunx vite preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
		timeout: 60_000,
	},
})
