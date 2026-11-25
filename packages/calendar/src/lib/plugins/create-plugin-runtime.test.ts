import { describe, expect, it } from 'bun:test'
import type { CalendarPlugin } from '../../types/plugin.types'
import { createPluginRuntime } from './create-plugin-runtime'

describe('createPluginRuntime', () => {
	it('transforms and filters events to the active range', () => {
		const expander: CalendarPlugin = {
			name: 'expander',
			transformEvents: (events) => [
				...events,
				{
					id: 'extra-in-range',
					title: 'In range',
					start: '2026-03-10T10:00:00Z',
					end: '2026-03-10T11:00:00Z',
				},
				{
					id: 'extra-out-of-range',
					title: 'Out of range',
					start: '2026-04-02T10:00:00Z',
					end: '2026-04-02T11:00:00Z',
				},
			],
		}

		const runtime = createPluginRuntime([expander])
		const visible = runtime.transformEvents([], {
			start: '2026-03-01T00:00:00Z',
			end: '2026-03-31T23:59:59Z',
			timezone: 'UTC',
		})

		expect(visible.map((event) => event.id)).toEqual(['extra-in-range'])
	})

	it('collects plugin views, drag-to-create config, managers, and contributions', () => {
		const pluginA: CalendarPlugin = {
			name: 'alpha',
			views: [{ name: 'kanban', label: 'Kanban' }],
			managesEvent: (event) => event.id === 'managed',
			contribute: (point, ctx) =>
				point === 'ical:vevent-properties' ? [`X-TEST:${String(ctx)}`] : [],
		}
		const pluginB: CalendarPlugin = {
			name: 'drag-to-create',
			dragToCreate: { onSelect: () => {} },
		}

		const runtime = createPluginRuntime([pluginA, pluginB])

		expect(runtime.getViews()).toHaveLength(1)
		expect(runtime.getView('kanban')?.label).toBe('Kanban')
		expect(
			runtime.getEventManager({
				id: 'managed',
				title: 'M',
				start: '2026-03-01T09:00:00Z',
				end: '2026-03-01T10:00:00Z',
			})?.name
		).toBe('alpha')
		expect(runtime.collect('ical:vevent-properties', 'val')).toEqual([
			'X-TEST:val',
		])
		expect(runtime.getDragToCreate()).toBeDefined()
	})
})
