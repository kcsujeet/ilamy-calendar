import { defineConfig } from 'bunup'
import { unused } from 'bunup/plugins'

export default defineConfig({
	// @ilamy/ui and @ilamy/utils are externalized below; the unused-deps check
	// can't see through externals, so it would flag them as removable. They are
	// real runtime deps (the dist imports @ilamy/ui/components/* and
	// @ilamy/utils/helpers), so ignore them here.
	plugins: [unused({ ignore: ['@ilamy/ui', '@ilamy/utils'] })],
	// Public entries: the core (`@ilamy/calendar`) and the test harness
	// (`@ilamy/calendar/testing`, for plugin authors). Recurrence is now its own
	// package (`@ilamy/calendar-recurrence`).
	entry: ['src/index.ts', 'src/testing/index.tsx'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	// All @ilamy/* siblings are published packages; keep them external so the
	// calendar bundle references the shared runtime code instead of inlining it.
	// (@ilamy/types is type-only — it has no runtime to externalize; bunup inlines
	// its type definitions into the emitted .d.ts, so the published types are
	// self-contained. The CalendarEvent augmentation targets @ilamy/calendar.)
	external: ['react', 'react-dom', /^@ilamy\//],
})
