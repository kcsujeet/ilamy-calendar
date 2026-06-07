import { defineConfig } from 'bunup'

// Plugin-contract types. A single module (not a runtime barrel: types are
// erased, so there is nothing to tree-shake). react and dayjs are externalized
// as the type peers a consumer already provides.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	clean: true,
	external: ['react', 'dayjs', /^dayjs\//],
})
