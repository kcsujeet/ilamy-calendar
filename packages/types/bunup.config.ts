import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	clean: true,
	external: ['react', '@ilamy/core', '@ilamy/utils', /^@ilamy\/utils\//],
})
