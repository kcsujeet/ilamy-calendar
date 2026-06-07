import { defineConfig } from 'bunup'

export default defineConfig({
	// Single published package. The internal workspace packages (@ilamy/ui,
	// @ilamy/utils, @ilamy/types, @ilamy/calendar-recurrence) are NOT published —
	// they are bundled in here. Public entries:
	//   .                    the core            -> dist/index.js
	//   ./testing            test harness        -> dist/testing/index.js
	//   ./plugins/recurrence the recurrence plugin -> dist/plugins/recurrence.js
	entry: ['src/index.ts', 'src/testing/index.tsx', 'src/plugins/recurrence.ts'],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	// No sourcemaps in the published package. `sourcemap: true` embeds an inline
	// base64 map in every .js (was ~84% of the shipped bytes); we ship code only
	// (the source is public on GitHub). See bunup docs (true === 'inline').
	sourcemap: 'none',
	// Bundle the internal @ilamy/* workspace packages into this output (they're
	// resolved to source via tsconfig paths). Their third-party deps (react,
	// radix, clsx, etc.) stay external — see package.json dependencies.
	noExternal: [/^@ilamy\/(ui|utils|types|calendar-recurrence)/],
	// `@ilamy/calendar` (self) stays external: the bundled recurrence plugin
	// imports the host's runtime (useIlamyCalendarContext, SLOT_* …) from
	// `@ilamy/calendar`. In the published ./plugins/recurrence entry that resolves
	// back to this same package's `.` export (one shared instance, no duplication).
	external: ['react', 'react-dom', '@ilamy/calendar'],
})
