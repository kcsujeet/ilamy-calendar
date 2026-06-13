import { describe, expect, it } from 'bun:test'
import { agendaPlugin } from './agenda-plugin'

describe('agendaPlugin', () => {
	it('registers a single view named agenda', () => {
		const plugin = agendaPlugin()
		expect(plugin.name).toBe('agenda')
		expect(plugin.views).toHaveLength(1)
		expect(plugin.views?.at(0)?.name).toBe('agenda')
	})

	it('threads the window option through to the view', () => {
		const view = agendaPlugin({ window: 7 }).views?.at(0)
		expect(view?.navigationStep).toEqual({ amount: 7, unit: 'day' })
	})
})
