import { defineConfig } from 'bunup'

// The recurrence plugin. Single entry (src/index.ts) registers the
// CalendarEvent augmentation and exports the plugin + helpers. The host
// (@ilamy/calendar), shared UI (@ilamy/ui), React, and rrule are externalized.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	external: ['react', 'react-dom', '@ilamy/calendar', /^@ilamy\/ui/, 'rrule'],
})
