import { defineConfig } from 'bunup'

// The agenda plugin. Single entry (src/index.ts) exports the plugin + factory.
// The host (@ilamy/calendar), shared UI/utils, and React are externalized;
// when bundled into @ilamy/calendar's ./plugins/agenda entry the workspace deps
// are resolved to source and bundled there instead.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	external: ['react', 'react-dom', '@ilamy/calendar', /^@ilamy\/utils/],
})
