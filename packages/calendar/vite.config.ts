import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server for the interactive demo: src/index.html -> frontend.tsx -> DemoPage.
// The library itself is bundled with bunup (`bun run build`); this config only
// powers `bun run dev`. `root` points at src/ so index.html stays where it is and
// the Bun production server (`bun run start`) keeps working unchanged.
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
	root: srcDir,
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': srcDir,
		},
	},
	server: {
		port: 4100,
		strictPort: true,
	},
})
