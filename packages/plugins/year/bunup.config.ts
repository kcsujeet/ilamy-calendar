import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: [
		'react',
		'react-dom',
		'lucide-react',
		'@ilamy/calendar',
		'@ilamy/core',
		/^@ilamy\/ui/,
		/^@ilamy\/utils/,
	],
})
