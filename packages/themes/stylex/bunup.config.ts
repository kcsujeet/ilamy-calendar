import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['react', 'react-dom', '@ilamy/calendar', '@stylexjs/stylex'],
})
