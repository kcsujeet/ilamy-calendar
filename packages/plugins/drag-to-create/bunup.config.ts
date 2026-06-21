import { defineConfig } from 'bunup'

// The drag-to-create plugin. Single entry (src/index.ts) exports the plugin +
// factory. The host (@ilamy/calendar), shared utils, and React are externalized;
// when bundled into @ilamy/calendar's ./plugins/drag-to-create entry the workspace
// deps are resolved to source and bundled there instead.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['react', 'react-dom', '@ilamy/calendar', /^@ilamy\/utils/],
})
