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
		define: {
			__VUE_OPTIONS_API__: true,
			__VUE_PROD_DEVTOOLS__: false,
			__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
		},
		optimizeDeps: {
			include: [
				'vue',
				'solid-js',
				'svelte',
				'@angular/core',
				'rxjs',
				'preact',
				'preact/hooks',
				'preact/jsx-runtime',
				'@base-ui/react/dialog',
				'@base-ui/react/popover',
				'@mui/material/Box',
				'@mui/material/Popover',
				'@mui/material/styles',
				'@radix-ui/react-popover',
				'@mui/material/Button',
				'@mui/material/ButtonGroup',
				'@mui/material/Dialog',
				'@mui/material/DialogActions',
				'@mui/material/DialogContent',
				'@mui/material/DialogTitle',
				'@mui/material/List',
				'@mui/material/ListItemButton',
				'@mui/material/ListItemText',
				'@mui/material/TextField',
				'@mui/material/ToggleButton',
				'@mui/material/ToggleButtonGroup',
				'@mui/material/Typography',
			],
		},
		plugins: [react(), tailwindcss()],
		resolve: {
			tsconfigPaths: true,
			alias: {
				'@ilamy/playground': pkg('playground/src'),
				'@ilamy/calendar/styles.css': pkg('calendar/dist/styles.css'),
				'@ilamy/calendar/styles/base.css': pkg('calendar/dist/styles/base.css'),
				'@ilamy/calendar/styles/theme.css': pkg(
					'calendar/dist/styles/theme.css'
				),
				'@ilamy/calendar/react': pkg('calendar/src/adapters/react.ts'),
				'@ilamy/calendar/vue': pkg('calendar/src/adapters/vue.ts'),
				'@ilamy/calendar/svelte': pkg('calendar/src/adapters/svelte.ts'),
				'@ilamy/calendar/solid': pkg('calendar/src/adapters/solid.ts'),
				'@ilamy/calendar/angular': pkg('calendar/src/adapters/angular.ts'),
				'@ilamy/calendar/testing': pkg('calendar/src/testing/index.tsx'),
				'@ilamy/calendar/plugins/recurrence': pkg(
					'calendar/src/plugins/recurrence.ts'
				),
				'@ilamy/calendar/plugins/agenda': pkg('calendar/src/plugins/agenda.ts'),
				'@ilamy/calendar/plugins/drag-to-create': pkg(
					'calendar/src/plugins/drag-to-create.ts'
				),
				'@ilamy/calendar/plugins/year': pkg('calendar/src/plugins/year.ts'),
				'@ilamy/calendar/plugins/ical': pkg('calendar/src/plugins/ical.ts'),
				'@ilamy/calendar': pkg('calendar/src/index.ts'),
			},
			// Source packages all import the host's hoisted runtimes; keep one copy so
			// hooks and reactive primitives don't see duplicate instances.
			dedupe: ['react', 'react-dom', 'preact', 'svelte', 'vue', 'solid-js'],
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
