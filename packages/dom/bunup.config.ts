import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: [
		'@ilamy/core',
		'@ilamy/utils',
		/^@ilamy\/utils\//,
		'rrule',
		'temporal-polyfill',
		/^temporal-polyfill\//,
	],
})
