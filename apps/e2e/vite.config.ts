import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = (path: string) =>
	fileURLToPath(new URL(`../../packages/${path}`, import.meta.url))

/*
 * Mirrors apps/demo: the `@ilamy/*` packages resolve to SOURCE so the harness
 * tests the code in the tree rather than the last build, and so every importer
 * shares one instance of each package (the configured-dayjs singleton and the
 * one React context both depend on that).
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		tsconfigPaths: true,
		alias: {
			'@ilamy/calendar/styles.css': pkg('calendar/dist/styles.css'),
			'@ilamy/calendar/styles/base.css': pkg('calendar/dist/styles/base.css'),
			'@ilamy/calendar/styles/theme.css': pkg('calendar/dist/styles/theme.css'),
			'@ilamy/calendar/react': pkg('adapters/react/src/index.ts'),
			'@ilamy/adapter-react/testing': pkg(
				'adapters/react/src/testing/index.tsx'
			),
			'@ilamy/adapter-react': pkg('adapters/react/src'),
			'@ilamy/calendar/dom': pkg('dom/src/index.ts'),
			'@ilamy/calendar/plugins/agenda': pkg('plugins/agenda/src'),
			'@ilamy/calendar/plugins/drag-to-create': pkg(
				'plugins/drag-to-create/src'
			),
			'@ilamy/calendar/plugins/ical': pkg('plugins/ical/src'),
			'@ilamy/calendar/plugins/recurrence': pkg('plugins/recurrence/src'),
			'@ilamy/calendar/plugins/year': pkg('plugins/year/src'),
			'@ilamy/calendar-agenda': pkg('plugins/agenda/src'),
			'@ilamy/calendar-drag-to-create': pkg('plugins/drag-to-create/src'),
			'@ilamy/calendar-ical': pkg('plugins/ical/src'),
			'@ilamy/calendar-recurrence': pkg('plugins/recurrence/src'),
			'@ilamy/calendar-year': pkg('plugins/year/src'),
			'@ilamy/core': pkg('core/src'),
			'@ilamy/calendar': pkg('calendar/src/index.ts'),
			'@ilamy/ui': pkg('ui/src'),
			'@ilamy/utils': pkg('utils/src'),
			'@ilamy/types': pkg('types/src'),
		},
		dedupe: ['react', 'react-dom'],
	},
	server: {
		port: 4200,
		strictPort: true,
	},
})
