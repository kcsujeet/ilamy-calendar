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
			'@ilamy/calendar-agenda': pkg('plugins/agenda/src'),
			'@ilamy/calendar-drag-to-create': pkg('plugins/drag-to-create/src'),
			'@ilamy/calendar-recurrence': pkg('plugins/recurrence/src'),
			'@ilamy/calendar': pkg('calendar/src'),
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
