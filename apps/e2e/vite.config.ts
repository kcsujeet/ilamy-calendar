import { fileURLToPath, URL } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
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
	define: {
		__VUE_OPTIONS_API__: true,
		__VUE_PROD_DEVTOOLS__: false,
		__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
	},
	optimizeDeps: {
		include: [
			'vue',
			'solid-js',
			'preact',
			'preact/hooks',
			'preact/jsx-runtime',
		],
	},
	plugins: [react(), svelte(), tailwindcss()],
	resolve: {
		tsconfigPaths: true,
		alias: {
			'@ilamy/calendar/styles.css': pkg('calendar/dist/styles.css'),
			'@ilamy/calendar/styles/base.css': pkg('calendar/dist/styles/base.css'),
			'@ilamy/calendar/styles/theme.css': pkg('calendar/dist/styles/theme.css'),
			'@ilamy/calendar/react': pkg('calendar/src/adapters/react.ts'),
			'@ilamy/calendar/vue': pkg('calendar/src/adapters/vue.ts'),
			'@ilamy/calendar/svelte': pkg('calendar/src/adapters/svelte.ts'),
			'@ilamy/calendar/solid': pkg('calendar/src/adapters/solid.ts'),
			'@ilamy/calendar/angular': pkg('calendar/src/adapters/angular.ts'),
			'@ilamy/calendar/testing': pkg('calendar/src/testing/index.tsx'),
			'@ilamy/calendar/plugins/agenda': pkg('calendar/src/plugins/agenda.ts'),
			'@ilamy/calendar/plugins/drag-to-create': pkg(
				'calendar/src/plugins/drag-to-create.ts'
			),
			'@ilamy/calendar/plugins/ical': pkg('calendar/src/plugins/ical.ts'),
			'@ilamy/calendar/plugins/recurrence': pkg(
				'calendar/src/plugins/recurrence.ts'
			),
			'@ilamy/calendar/plugins/year': pkg('calendar/src/plugins/year.ts'),
			'@ilamy/calendar': pkg('calendar/src/index.ts'),
		},
		dedupe: ['react', 'react-dom', 'preact', 'svelte', 'vue', 'solid-js'],
	},
	server: {
		port: 4200,
		strictPort: true,
	},
})
