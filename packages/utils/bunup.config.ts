import { defineConfig } from 'bunup'

// Shared runtime utilities. No barrel: the configured dayjs instance and the
// small pure helpers are separate entries, exposed as subpaths
// (`@ilamy/utils/dayjs`, `@ilamy/utils/helpers`). `dayjs` is externalized so a
// single copy is shared across the ecosystem (its plugin augmentations only
// apply once per dayjs instance).
export default defineConfig({
	entry: ['src/dayjs.ts', 'src/helpers.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	external: ['dayjs', /^dayjs\//],
})
