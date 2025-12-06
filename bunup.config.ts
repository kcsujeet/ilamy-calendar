import { defineConfig } from 'bunup'
import { unused } from 'bunup/plugins'

export default defineConfig({
	plugins: [unused()],
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	external: ['react', 'react-dom'],
})
