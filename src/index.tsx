// oxlint-disable no-unused-vars
import { serve } from 'bun'
import index from './index.html'

const _server = serve({
	port: 4100,
	routes: {
		// Serve index.html for all unmatched routes.
		'/*': index,
	},

	// oxlint-disable-next-line no-undef
	development: process.env.NODE_ENV !== 'production' && {
		// Enable browser hot reloading in development
		hmr: true,

		// Echo console logs from the browser to the server
		console: true,
	},
})
