import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://astro.build/config
export default defineConfig({
	site: 'https://ilamy.dev',
	server: {
		host: true,
		port: 4200,
	},

	vite: {
		ssr: {
			noExternal: ['zod'],
		},
		plugins: [tailwindcss(), tsconfigPaths()],
	},

	integrations: [
		react(),
		sitemap(),
		starlight({
			title: 'ilamy Calendar',
			description: 'Documentation for ilamy Calendar',
			logo: {
				src: './public/ilamy.svg',
				alt: 'ilamy Calendar Logo',
			},
			favicon: '/favicon.svg',
			customCss: ['./src/styles/starlight-custom.css'],
			components: {
				Head: './src/components/starlight/Head.astro',
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/kcsujeet/ilamy-calendar',
					target: '_blank',
				},
			],
			sidebar: [
				{
					label: 'Introduction',
					slug: 'docs/introduction',
				},
				{
					label: 'Getting Started',
					items: [
						{
							label: 'Installation',
							slug: 'docs/getting-started/installation',
						},
						{ label: 'Usage', slug: 'docs/getting-started/usage' },
					],
				},
				{
					label: 'Components',
					items: [
						{ label: 'Calendar', slug: 'docs/components/calendar' },
						{
							label: 'Resource Calendar',
							slug: 'docs/components/resource-calendar',
						},
						{
							label: 'useIlamyCalendarContext',
							slug: 'docs/components/use-ilamy-calendar-context',
						},
					],
				},
				{
					label: 'Features',
					items: [
						{
							label: 'Internationalization',
							slug: 'docs/features/internationalization',
						},
						{ label: 'iCal Export', slug: 'docs/features/ical-export' },
						{ label: 'Recurrence', slug: 'docs/features/recurrence' },
					],
				},
				{
					label: 'Customization',
					items: [
						{ label: 'Components', slug: 'docs/customization/components' },
						{ label: 'Styling', slug: 'docs/customization/styling' },
					],
				},
				{
					label: 'Help',
					items: [
						{ label: 'FAQ', slug: 'docs/help/faq' },
						{ label: 'Support', slug: 'docs/help/support' },
					],
				},
			],
		}),
	],
})
