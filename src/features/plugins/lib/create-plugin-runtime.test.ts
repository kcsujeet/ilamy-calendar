import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { createPluginRuntime } from './create-plugin-runtime'
import type { IlamyPlugin } from './types'

// The runtime is generic: it passes slotName through untouched and never
// references the host's slot catalog. Arbitrary names prove that.
const A_SLOT = 'a-slot'
const ANOTHER_SLOT = 'another-slot'

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

const isSpecial = (e: CalendarEvent): boolean =>
	Boolean((e as unknown as { special?: boolean }).special)

// A plugin that expands special events into two and claims them.
const fakePlugin = (): IlamyPlugin => ({
	name: 'fake',
	managesEvent: (e) => isSpecial(e),
	transformEvents: (events) =>
		events.flatMap((e) =>
			isSpecial(e) ? [e, { ...e, id: `${e.id}-copy` }] : [e]
		),
})

describe('createPluginRuntime', () => {
	test('transformEvents runs the plugin chain, then range-filters', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		const result = runtime.transformEvents(
			[ev('a', '2025-01-05T09:00:00.000Z', true)],
			range
		)
		expect(result.map((e) => e.id)).toEqual(['a', 'a-copy'])
	})

	test('transformEvents chains plugins sequentially (each sees prior output)', () => {
		const addCopy: IlamyPlugin = {
			name: 'addCopy',
			transformEvents: (events) =>
				events.flatMap((e) => [e, { ...e, id: `${e.id}-1` }]),
		}
		const retitleByIndex: IlamyPlugin = {
			name: 'retitleByIndex',
			transformEvents: (events) =>
				events.map((e, i) => ({ ...e, title: `${i}` })),
		}
		const runtime = createPluginRuntime([addCopy, retitleByIndex])
		const result = runtime.transformEvents(
			[ev('a', '2025-01-05T09:00:00.000Z')],
			range
		)
		// addCopy produced [a, a-1]; retitleByIndex then renamed by position.
		expect(result.map((e) => e.title)).toEqual(['0', '1'])
	})

	test('transformEvents with no plugins is the overlap filter', () => {
		const runtime = createPluginRuntime([])
		const inRange = ev('b', '2025-01-10T09:00:00.000Z')
		const outOfRange = ev('c', '2024-06-10T09:00:00.000Z')
		const result = runtime.transformEvents([inRange, outOfRange], range)
		expect(result.map((e) => e.id)).toEqual(['b'])
	})

	test('transformEvents range-filters plugin-produced events too', () => {
		const injectOutOfRange: IlamyPlugin = {
			name: 'inject',
			transformEvents: (events) => [
				...events,
				ev('far', '2020-01-01T00:00:00.000Z'),
			],
		}
		const runtime = createPluginRuntime([injectOutOfRange])
		const result = runtime.transformEvents(
			[ev('b', '2025-01-10T09:00:00.000Z')],
			range
		)
		expect(result.map((e) => e.id)).toEqual(['b'])
	})

	test('getEventManager returns the first plugin that manages the event', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		expect(
			runtime.getEventManager(ev('a', '2025-01-05T09:00:00.000Z', true))?.name
		).toBe('fake')
		expect(
			runtime.getEventManager(ev('b', '2025-01-05T09:00:00.000Z'))
		).toBeUndefined()
	})

	test('renderSlot collects a node from every plugin that renders the slot', () => {
		const withForm: IlamyPlugin = {
			name: 'withForm',
			renderSlot: (slotName) =>
				slotName === A_SLOT ? createElement('div') : null,
		}
		const noRender: IlamyPlugin = { name: 'noRender' }
		const runtime = createPluginRuntime([withForm, noRender])
		expect(runtime.renderSlot(A_SLOT, {})).toHaveLength(1)
	})

	test('renderSlot returns nothing when no plugin renders the slot', () => {
		const runtime = createPluginRuntime([fakePlugin()])
		expect(runtime.renderSlot(ANOTHER_SLOT, {})).toHaveLength(0)
	})

	test('collect flattens contributions from all plugins for a point', () => {
		const a: IlamyPlugin = {
			name: 'a',
			contribute: (p) => (p === 'x' ? ['a1'] : []),
		}
		const b: IlamyPlugin = {
			name: 'b',
			contribute: (p) => (p === 'x' ? ['b1', 'b2'] : []),
		}
		expect(createPluginRuntime([a, b]).collect('x', null)).toEqual([
			'a1',
			'b1',
			'b2',
		])
	})
	test('collect ignores plugins without contribute or contributing to other points', () => {
		const a: IlamyPlugin = {
			name: 'a',
			contribute: (p) => (p === 'x' ? ['a1'] : []),
		}
		expect(createPluginRuntime([a, { name: 'b' }]).collect('y', null)).toEqual(
			[]
		)
	})
	test('collect passes the context through to contribute', () => {
		let seen: unknown
		const a: IlamyPlugin = {
			name: 'a',
			contribute: (_p, ctx) => {
				seen = ctx
				return []
			},
		}
		createPluginRuntime([a]).collect('x', { hello: 'world' })
		expect(seen).toEqual({ hello: 'world' })
	})
})
