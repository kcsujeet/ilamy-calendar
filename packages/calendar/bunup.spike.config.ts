import { defineConfig } from 'bunup'

export default defineConfig({
	entry: [
		'src/spike/types/slot.types.ts',
		'src/spike/features/adapters/react/spike-react-calendar.tsx',
		'src/spike/features/adapters/svelte/spike-svelte-calendar.ts',
	],
	sourceBase: './src/spike',
	preferredTsconfig: './tsconfig.spike.json',
	format: ['esm'],
	outDir: 'dist-spike',
	minify: true,
	clean: true,
	dts: true,
	sourcemap: 'none',
	jsx: {
		development: false,
	},
	noExternal: [/^@ilamy\/(core|utils)/],
	external: [
		'react',
		'react-dom',
		'svelte',
		/^svelte\//,
		'preact',
		/^preact\//,
		'temporal-polyfill',
		/^temporal-polyfill\//,
		'@ilamy/calendar',
	],
})
