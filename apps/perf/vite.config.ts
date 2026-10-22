import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/*
 * Unlike apps/e2e, nothing here aliases @ilamy/* to source. The perf app
 * imports the calendar the way a consumer does, through the BUILT package
 * (`@ilamy/calendar` -> packages/calendar/dist), so the benchmark measures what
 * ships, minified, and so the identical app runs against any checkout.
 *
 * The one deliberate change from a consumer's build: `react-dom` resolves to
 * its profiling build, because <Profiler> reports nothing in a plain production
 * build (https://react.dev/reference/react/Profiler#profiling-in-production).
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{ find: /^react-dom\/client$/, replacement: 'react-dom/profiling' },
		],
		dedupe: ['react', 'react-dom'],
	},
	build: { sourcemap: false, minify: process.env.PERF_NO_MINIFY !== '1' },
})
