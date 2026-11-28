import { describe, expect, it } from 'bun:test'
import { dragToCreatePlugin } from './drag-to-create-plugin'

describe('dragToCreatePlugin', () => {
	it('registers a named plugin that enables dragToCreate config', () => {
		const plugin = dragToCreatePlugin()

		expect(plugin.name).toBe('drag-to-create')
		expect(plugin.dragToCreate).toBeDefined()
	})

	it('forwards a custom onSelect callback', () => {
		const onSelect = () => {}
		const plugin = dragToCreatePlugin({ onSelect })

		expect(plugin.name).toBe('drag-to-create')
		expect(plugin.dragToCreate?.onSelect).toBe(onSelect)
	})
})
