import { defineConfig, devices } from '@playwright/test'

/*
 * E2E_PORT lets each git worktree run on its own port. Two worktrees on the
 * same port would either collide on --strictPort or, worse, share a server
 * through reuseExistingServer and test the other worktree's code.
 */
const PORT = Number(process.env.E2E_PORT ?? 4200)

/*
 * The real demo app (apps/demo), with its default settings and seed events.
 * The harness above mounts the calendar on clean fixtures, so it stays green
 * when the demo's own defaults make the calendar look broken: business hours
 * on by default refused every resize on a weekend, and the owner reported
 * "resize is broken". The `demo` project drives what a visitor gets.
 * E2E_DEMO_PORT does for it what E2E_PORT does for the harness.
 */
const DEMO_PORT = Number(process.env.E2E_DEMO_PORT ?? 4210)

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
	projects: [
		{
			name: 'chromium',
			testDir: './tests',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'demo',
			testDir: './demo-tests',
			use: {
				...devices['Desktop Chrome'],
				baseURL: `http://localhost:${DEMO_PORT}`,
			},
		},
	],
	webServer: [
		{
			command: `bun x vite --port ${PORT} --strictPort`,
			url: `http://localhost:${PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
		{
			command: `bun x vite --port ${DEMO_PORT} --strictPort`,
			cwd: '../demo',
			url: `http://localhost:${DEMO_PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
})
