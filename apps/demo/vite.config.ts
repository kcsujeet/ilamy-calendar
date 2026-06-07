import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server / build for the interactive demo. index.html -> src/frontend.tsx
// -> DemoPage. `@` resolves to the demo's own src (e.g. `@/lib/seed`); the
// calendar, recurrence plugin, and UI primitives come from their published
// `@ilamy/*` packages.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		port: 4100,
		strictPort: true,
	},
})
