import { defineConfig } from 'bunup'
import { unused } from 'bunup/plugins'

export default defineConfig({
	plugins: [unused()],
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
	// calendar bundle references the shared code instead of inlining it.
	// @ilamy/types in particular MUST stay external: the emitted .d.ts then
	// re-exports `CalendarEvent` from `@ilamy/types` rather than inlining a
	// private copy, so there is a single `CalendarEvent` identity. That lets the
	// recurrence plugin's `declare module '@ilamy/types'` augmentation apply to
	// the same type the calendar runtime (e.g. `useIlamyCalendarContext`) returns.
	external: ['react', 'react-dom', /^@ilamy\//],
})
