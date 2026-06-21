import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
export default defineConfig({
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
	},
})
