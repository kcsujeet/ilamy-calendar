import { describe, expect, it } from 'bun:test'
import { createAgendaView } from './create-agenda-view'

const date = '2026-06-13T12:00:00Z'
const cfg = { firstDayOfWeek: 0, timezone: 'UTC' }

describe('createAgendaView', () => {
	it('defaults to a month window', () => {
		const view = createAgendaView()
		expect(view.name).toBe('agenda')
		expect(view.label).toBe('agenda')
		expect(view.supportsResources).toBe(false)
		expect(view.navigationStep).toEqual({ amount: 1, unit: 'month' })
		const range = view.range?.(date, cfg)
		expect(range?.start.slice(0, 10)).toBe('2026-06-01')
		expect(range?.end.slice(0, 10)).toBe('2026-06-30')
	})

	it('scopes a day window to the reference day', () => {
		const view = createAgendaView({ window: 'day' })
		expect(view.navigationStep).toEqual({ amount: 1, unit: 'day' })
		const range = view.range?.(date, cfg)
		expect(range?.start.slice(0, 10)).toBe('2026-06-13')
		expect(range?.end.slice(0, 10)).toBe('2026-06-13')
	})

	it('aligns a week window to firstDayOfWeek', () => {
		const view = createAgendaView({ window: 'week' })
		expect(view.navigationStep).toEqual({ amount: 1, unit: 'week' })
		// 2026-06-13 is a Saturday; Sunday-start week is 06-07..06-13.
		const sundayStart = view.range?.(date, {
			firstDayOfWeek: 0,
			timezone: 'UTC',
		})
		expect(sundayStart?.start.slice(0, 10)).toBe('2026-06-07')
		expect(sundayStart?.end.slice(0, 10)).toBe('2026-06-13')
		// Monday-start week shifts to 06-08..06-14.
		const mondayStart = view.range?.(date, {
			firstDayOfWeek: 1,
			timezone: 'UTC',
		})
		expect(mondayStart?.start.slice(0, 10)).toBe('2026-06-08')
		expect(mondayStart?.end.slice(0, 10)).toBe('2026-06-14')
	})

	it('supports a fixed N-day window stepped by N days', () => {
		const view = createAgendaView({ window: 7 })
		expect(view.navigationStep).toEqual({ amount: 7, unit: 'day' })
		const range = view.range?.(date, cfg)
		expect(range?.start.slice(0, 10)).toBe('2026-06-13')
		expect(range?.end.slice(0, 10)).toBe('2026-06-19')
	})

	it('mounts via framework-agnostic mountView', () => {
		expect(typeof createAgendaView().mountView?.mount).toBe('function')
	})
})
