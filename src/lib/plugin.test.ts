import { describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { createPluginRuntime, type IlamyPlugin } from './plugin'

const ev = (id: string, startISO: string, special = false): CalendarEvent =>
	({
		id,
		title: id,
		start: dayjs(startISO),
		end: dayjs(startISO).add(1, 'hour'),
		special,
	}) as unknown as CalendarEvent

const range = {
	start: dayjs('2025-01-01T00:00:00.000Z'),
	end: dayjs('2025-01-31T23:59:59.999Z'),
}

const fakePlugin = (): IlamyPlugin => ({
	name: 'fake',
	ownsEvent: (e) => Boolean((e as unknown as { special?: boolean }).special),
	expandEvent: (e) =>
		(e as unknown as { special?: boolean }).special
			? [e, { ...e, id: `${e.id}-copy` }]
			: null,
})

describe('createPluginRuntime', () => {
	test('expandEvents uses a plugin when it returns occurrences', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		const result = runtime.expandEvents(
			[ev('a', '2025-01-05T09:00:00.000Z', true)],
			range
		)
		expect(result.map((e) => e.id)).toEqual(['a', 'a-copy'])
	})

	test('expandEvents forwards the full event list to expandEvent (for override resolution)', () => {
		let seenAll: CalendarEvent[] | undefined
		const capturePlugin: IlamyPlugin = {
			name: 'capture',
			expandEvent: (e, _range, allEvents) => {
				seenAll = allEvents
				return [e]
			},
		}
		const events = [
			ev('a', '2025-01-05T09:00:00.000Z'),
			ev('b', '2025-01-06T09:00:00.000Z'),
		]
		createPluginRuntime([capturePlugin]).expandEvents(events, range)
		expect(seenAll?.map((e) => e.id)).toEqual(['a', 'b'])
	})

	test('expandEvents falls back to overlap default when no plugin claims the event', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		const inRange = ev('b', '2025-01-10T09:00:00.000Z')
		const outOfRange = ev('c', '2024-06-10T09:00:00.000Z')
		const result = runtime.expandEvents([inRange, outOfRange], range)
		expect(result.map((e) => e.id)).toEqual(['b'])
	})

	test('expandEvents with no plugins is the overlap default', () => {
		const runtime = createPluginRuntime([])
		const result = runtime.expandEvents(
			[ev('b', '2025-01-10T09:00:00.000Z')],
			range
		)
		expect(result.map((e) => e.id)).toEqual(['b'])
	})

	test('getOwner returns the first plugin that claims the event', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		expect(
			runtime.getOwner(ev('a', '2025-01-05T09:00:00.000Z', true))?.name
		).toBe('fake')
		expect(
			runtime.getOwner(ev('b', '2025-01-05T09:00:00.000Z'))
		).toBeUndefined()
	})

	test('getFormSectionPlugins returns only plugins with a form section', () => {
		const withSection: IlamyPlugin = {
			name: 'x',
			renderFormSection: () => null,
		}
		const runtime = createPluginRuntime([fakePlugin(), withSection])
		expect(runtime.getFormSectionPlugins().map((p) => p.name)).toEqual(['x'])
	})
})
