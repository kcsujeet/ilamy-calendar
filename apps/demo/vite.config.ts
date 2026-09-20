import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const pkg = (path: string) =>
	fileURLToPath(new URL(`../../packages/${path}`, import.meta.url))

// Dev server / build for the interactive demo. index.html -> src/frontend.tsx
// -> DemoPage.
//
// HMR for library edits: the `@ilamy/*` packages resolve to their SOURCE (not
// the published dist), so editing the calendar / plugins / UI hot-reloads here.
// Two mechanisms, by design:
//   1. resolve.alias maps each package *name* to its src directory. These are
//      global, so EVERY importer (the demo, the plugins, the calendar core)
//      shares one instance of each package -- critical for the configured-dayjs
//      singleton in @ilamy/utils and the one React context in @ilamy/calendar.
//      Word-boundary matching means `@ilamy/calendar` does not capture
//      `@ilamy/calendar-agenda`.
//   2. resolve.tsconfigPaths resolves each package's internal `@/*` per-file via
//      that package's own tsconfig (calendar's `@/` -> calendar/src, the demo's
//      `@/` -> demo/src). A single global `@` alias can't serve both, which is
//      why this is left to tsconfig resolution.
//
// The demo's type-check (`tsc --noEmit`) still resolves `@ilamy/*` via dist, so
// it keeps validating against the published API surface.
export default defineConfig(({ mode }) => {
	// Third argument '' loads every variable, not just the VITE_-prefixed ones
	// (https://vite.dev/config/). This is what lets a gitignored
	// `apps/demo/.env.local` turn polling on for one machine.
	const env = loadEnv(mode, process.cwd(), '')

	return {
		plugins: [react(), tailwindcss()],
		resolve: {
			tsconfigPaths: true,
			alias: {
				'@ilamy/playground': pkg('playground/src'),
				'@ilamy/calendar-agenda': pkg('plugins/agenda/src'),
				'@ilamy/calendar-drag-to-create': pkg('plugins/drag-to-create/src'),
				'@ilamy/calendar-recurrence': pkg('plugins/recurrence/src'),
				'@ilamy/calendar': pkg('calendar/src'),
				'@ilamy/ui': pkg('ui/src'),
				'@ilamy/utils': pkg('utils/src'),
				'@ilamy/types': pkg('types/src'),
			},
			// Source packages all import the host's hoisted react; keep one copy so
			// hooks don't see two React instances.
			dedupe: ['react', 'react-dom'],
		},
		server: {
			port: 4100,
			strictPort: true,
			// Escape hatch for a machine whose native file watcher is broken.
			//
			// macOS's fsevents backend can wedge system-wide: every `fs.watch` in a
			// fresh process then fails with EMFILE regardless of `ulimit -n` (measured
			// at 1024 through 1048576) and regardless of the directory, while there is
			// no actual fd pressure (12k of 368k system-wide). Vite swallows the error,
			// so the server starts clean, serves correctly, and simply never invalidates
			// anything again -- HMR looks "broken" with nothing in the log.
			//
			// A reboot is the real answer; polling is unaffected by the fault and keeps
			// you working until then. Off by default because it costs CPU on a repo
			// this size and nobody else should pay for one wedged laptop -- switch it
			// on per machine with `VITE_USE_POLLING=1` in a gitignored
			// `apps/demo/.env.local`, or in the environment.
			watch: {
				usePolling: env.VITE_USE_POLLING === '1',
			},
		},
	}
})
