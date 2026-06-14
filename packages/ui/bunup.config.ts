import { defineConfig } from 'bunup'

// Shared shadcn primitives. No barrel: each primitive + `cn` is its own entry,
// exposed as a subpath (`@ilamy/ui/components/<name>`, `@ilamy/ui/lib/utils`).
// React + the Radix/icon/style deps are externalized so consumers dedupe them.
export default defineConfig({
	entry: [
		'src/components/button.tsx',
		'src/components/card.tsx',
		'src/components/checkbox.tsx',
		'src/components/current-time-indicator.tsx',
		'src/components/day-label.tsx',
		'src/components/dialog.tsx',
		'src/components/input.tsx',
		'src/components/label.tsx',
		'src/components/popover.tsx',
		'src/components/scroll-area.tsx',
		'src/components/select.tsx',
		'src/components/textarea.tsx',
		'src/lib/utils.ts',
	],
	format: ['esm'],
	outDir: 'dist',
	minify: true,
	clean: true,
	sourcemap: true,
	// Stock shadcn primitives have no explicit return types; use full TS
	// inference for .d.ts instead of isolated declarations (which would require
	// annotating every component). These are leaf files, so the slower dts is
	// negligible.
	dts: {
		inferTypes: true,
	},
	external: [
		'react',
		'react-dom',
		'react/jsx-runtime',
		/^@ilamy\/utils/,
		/^@radix-ui\//,
		'lucide-react',
		'class-variance-authority',
		'clsx',
		'tailwind-merge',
	],
})
