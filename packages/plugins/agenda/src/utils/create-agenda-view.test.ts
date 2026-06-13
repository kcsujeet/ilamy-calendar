import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { createAgendaView } from './create-agenda-view'

const date = dayjs('2026-06-13T12:00:00')
const cfg = { firstDayOfWeek: 0 }

describe('createAgendaView', () => {
	it('defaults to a month window', () => {
		const view = createAgendaView()
		expect(view.name).toBe('agenda')
		expect(view.label).toBe('agenda')
		expect(view.supportsResources).toBe(false)
		expect(view.navigationStep).toEqual({ amount: 1, unit: 'month' })
		const range = view.range?.(date, cfg)
		expect(range?.start.format('YYYY-MM-DD')).toBe('2026-06-01')
		expect(range?.end.format('YYYY-MM-DD')).toBe('2026-06-30')
	})

	it('supports a fixed N-day window stepped by N days', () => {
		const view = createAgendaView({ window: 7 })
		expect(view.navigationStep).toEqual({ amount: 7, unit: 'day' })
		const range = view.range?.(date, cfg)
		expect(range?.start.format('YYYY-MM-DD')).toBe('2026-06-13')
		expect(range?.end.format('YYYY-MM-DD')).toBe('2026-06-19')
	})

	it('renders via a component (escape hatch)', () => {
		expect(typeof createAgendaView().component).toBe('function')
	})
})
