import { defineConfig } from 'bunup'

// Shared runtime utilities. Separate subpaths (`@ilamy/utils/temporal`,
// `@ilamy/utils/helpers`). `temporal-polyfill` stays external so consumers
// dedupe it cleanly.
export default defineConfig({
	entry: ['src/helpers.ts', 'src/ical-format.ts', 'src/temporal.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['temporal-polyfill', /^temporal-polyfill\//],
})
