import { defineConfig } from 'bunup'
import { unused } from 'bunup/plugins'

export default defineConfig({
	plugins: [unused()],
	// Two public entry points: the core (`@ilamy/calendar`) and the recurrence
	// plugin subpath (`@ilamy/calendar/plugins/recurrence`). bunup maps each
	// entry to an output path mirroring its location under the entries' lowest
	// common ancestor (`src/`), so recurrence emits to
	// `dist/features/plugins/recurrence/recurrence.{js,d.ts}` — the package.json
	// `exports` map points the subpath at that file.
	entry: ['src/index.ts', 'src/features/plugins/recurrence/recurrence.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	external: ['react', 'react-dom'],
})
