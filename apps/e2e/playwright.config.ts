import { defineConfig, devices } from '@playwright/test'

const PORT = 4200

/*
 * Everything the machine could otherwise decide is pinned here: the zone, the
 * locale, the viewport and the colour scheme. A suite that inherits any of them
 * from the host asserts something different on a colleague's laptop than it
 * does in CI.
 *
 * There is no screenshot comparison. Pixel baselines only match the platform
 * that produced them, and every intentional restyle means reviewing a dozen
 * image diffs — a check nobody genuinely reads is worse than no check, because
 * it turns a real signal into a ritual. Layout is asserted through behaviour
 * and geometry instead. See docs/e2e-testing.md.
 */
export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['html'], ['github']] : [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		timezoneId: 'UTC',
		locale: 'en-US',
		colorScheme: 'light',
		viewport: { width: 1280, height: 900 },
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `bun x vite --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
})
