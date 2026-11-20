import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['@ilamy/core', '@ilamy/dom', '@angular/core', 'rxjs'],
})
