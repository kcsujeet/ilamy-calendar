import { describe, expect, it } from 'bun:test'
import { dragToCreatePlugin } from './drag-to-create-plugin'

describe('dragToCreatePlugin', () => {
	it('registers a named plugin that contributes a provider', () => {
		const plugin = dragToCreatePlugin()

		expect(plugin.name).toBe('drag-to-create')
		expect(typeof plugin.provider).toBe('function')
	})

	it('accepts a custom onSelect option', () => {
		const plugin = dragToCreatePlugin({ onSelect: () => {} })

		expect(plugin.name).toBe('drag-to-create')
	})
})
