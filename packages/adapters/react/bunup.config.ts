import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts', 'src/testing/index.tsx'],
	sourceBase: './src',
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: [
		'react',
		'react-dom',
		'@dnd-kit/core',
		'@dnd-kit/modifiers',
		'lucide-react',
		'@ilamy/calendar',
		'@ilamy/core',
		'@ilamy/types',
		/^@ilamy\/ui/,
		/^@ilamy\/utils/,
	],
})
