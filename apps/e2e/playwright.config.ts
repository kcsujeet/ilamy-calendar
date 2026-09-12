import { defineConfig, devices } from '@playwright/test'

const PORT = 4200

/*
 * Everything the machine could otherwise decide is pinned here: the zone, the
 * locale, the viewport and the colour scheme. A suite that inherits any of them
 * from the host asserts something different on a colleague's laptop than it
 * does in CI, and the visual baselines stop meaning anything at all.
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
