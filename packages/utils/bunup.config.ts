import { defineConfig } from 'bunup'

// Shared runtime utilities. No barrel: the configured dayjs instance, the small
// pure helpers and the event-time helpers are separate entries, exposed as
// subpaths (`@ilamy/utils/dayjs`, `@ilamy/utils/helpers`,
// `@ilamy/utils/events`). `dayjs` is externalized so a single copy is shared
// across the ecosystem (its plugin augmentations only apply once per dayjs
// instance).
export default defineConfig({
	entry: ['src/dayjs.ts', 'src/helpers.ts', 'src/events.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['dayjs', /^dayjs\//],
})
