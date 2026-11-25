import { afterEach, describe, expect, it } from 'bun:test'
import {
	createTranslator,
	type PluginToolbarContext,
	SLOT_TOOLBAR,
} from '@ilamy/calendar'
import { screen } from '@testing-library/react'
import { icalPlugin } from './index'

const makeToolbarContext = (): PluginToolbarContext => ({
	placement: 'desktop',
	events: [],
	resources: [],
	currentDate: '2025-03-10T00:00:00Z',
	view: 'month',
	timezone: 'UTC',
	locale: 'en-US',
	t: createTranslator(),
	collect: () => [],
})

describe('icalPlugin integration', () => {
	const hosts: HTMLElement[] = []

	afterEach(() => {
		for (const el of hosts.splice(0)) {
			el.remove()
		}
	})

	it('mounts the Export button in SLOT_TOOLBAR by default', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		hosts.push(host)

		const plugin = icalPlugin()
		const handle = plugin.mountSlot?.(SLOT_TOOLBAR, host, makeToolbarContext())

		expect(handle).toBeTruthy()
		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
		handle?.destroy()
	})

	it('hides the toolbar Export button when showToolbarButton is false', () => {
		const host = document.createElement('div')
		document.body.appendChild(host)
		hosts.push(host)

		const plugin = icalPlugin({ showToolbarButton: false })
		const handle = plugin.mountSlot?.(SLOT_TOOLBAR, host, makeToolbarContext())

		expect(handle).toBeNull()
		expect(
			screen.queryByRole('button', { name: /export/i })
		).not.toBeInTheDocument()
	})
})
