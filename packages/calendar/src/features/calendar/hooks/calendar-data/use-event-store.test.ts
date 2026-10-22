import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { renderHook } from '@testing-library/react'
import { createPluginRuntime } from '@/lib/plugins/create-plugin-runtime'
import { useEventStore } from './use-event-store'

const at = (day: number, hour = 9) =>
	dayjs(
		`2025-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
	)
const mkEvent = (id: string, day: number): CalendarEvent => ({
	id,
	title: id,
	start: at(day),
	end: at(day, 10),
})

const renderStoreHook = (initialEvents: CalendarEvent[]) => {
	const asked: string[] = []
	const countingPlugin = {
		name: 'counting',
		transformEvents: (events: CalendarEvent[]) => {
			asked.push('transform')
			return events
		},
	}
	const pluginRuntime = createPluginRuntime([countingPlugin])
	const getCurrentViewRange = () => ({ start: at(10, 0), end: at(16, 23) })
	const hook = renderHook(
		(props: { events: CalendarEvent[] }) =>
			useEventStore({
				events: props.events,
				pluginRuntime,
				getCurrentViewRange,
			}),
		{ initialProps: { events: initialEvents } }
	)
	return { hook, asked }
}

describe('useEventStore getEventsForDateRange', () => {
	it('expands a range once however many rows ask for it', () => {
		const { hook, asked } = renderStoreHook([mkEvent('a', 11)])
		const askedAfterMount = asked.length
		const { getEventsForDateRange } = hook.result.current
		const answers = Array.from({ length: 50 }, () =>
			getEventsForDateRange(at(10, 0), at(16, 23))
		)
		// The view's own range was already asked for on mount, so a row asking
		// for it again adds no expansion.
		expect(asked.length - askedAfterMount).toBe(0)
		expect(new Set(answers).size).toBe(1)
	})

	it('expands another range separately', () => {
		const { hook, asked } = renderStoreHook([mkEvent('a', 11)])
		const askedBefore = asked.length
		hook.result.current.getEventsForDateRange(at(11, 0), at(11, 23))
		expect(asked.length - askedBefore).toBe(1)
	})

	it('answers again from the new events after they change', () => {
		const { hook } = renderStoreHook([mkEvent('a', 11)])
		const before = hook.result.current.getEventsForDateRange(
			at(10, 0),
			at(16, 23)
		)
		hook.rerender({ events: [mkEvent('a', 11), mkEvent('b', 12)] })
		const after = hook.result.current.getEventsForDateRange(
			at(10, 0),
			at(16, 23)
		)
		expect(before.map((e) => e.id)).toEqual(['a'])
		expect(after.map((e) => e.id)).toEqual(['a', 'b'])
	})

	it('hands out a list a consumer cannot mutate in a development build', () => {
		const { hook } = renderStoreHook([mkEvent('a', 11)])
		const shared = hook.result.current.getEventsForDateRange(
			at(10, 0),
			at(16, 23)
		)
		expect(() => shared.push(mkEvent('x', 12))).toThrow()
		expect(hook.result.current.processedEvents).toBe(shared)
	})
})
