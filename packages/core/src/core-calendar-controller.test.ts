import { describe, expect, it } from 'bun:test'
import { createCalendarController } from './core-calendar-controller'
import { normalizeEvent } from './utils/core-normalize.utils'

describe('headless calendar controller', () => {
	it('runs multiple independent timezone controllers simultaneously with zero leakage', () => {
		const ny = createCalendarController({
			timezone: 'America/New_York',
			initialDate: '2026-03-09T09:00',
			initialView: 'day',
			events: [
				{
					id: '1',
					title: 'Standup',
					start: '2026-03-09T09:00',
					end: '2026-03-09T10:00',
				},
			],
		})
		const tokyo = createCalendarController({
			timezone: 'Asia/Tokyo',
			initialDate: '2026-03-09T09:00',
			initialView: 'day',
			events: [
				{
					id: '2',
					title: 'Tokyo sync',
					start: '2026-03-09T09:00',
					end: '2026-03-09T10:00',
				},
			],
		})

		expect(ny.getState().events.at(0)?.start).toBe('2026-03-09T09:00:00-04:00')
		expect(tokyo.getState().events.at(0)?.start).toBe(
			'2026-03-09T09:00:00+09:00'
		)
	})

	it('trims visibleRange to drawn days when weekends are hidden (D10)', () => {
		const ctrl = createCalendarController({
			timezone: 'UTC',
			initialDate: '2026-03-04T12:00:00Z', // Wednesday
			initialView: 'week',
			firstDayOfWeek: 'sunday',
			weekends: false,
		})

		const { visibleRange } = ctrl.getState()
		expect(visibleRange.start).toBe('2026-03-02T00:00:00+00:00') // Monday
		expect(visibleRange.end).toBe('2026-03-06T23:59:59.999+00:00') // Friday
	})

	it('notifies subscribers on navigation and CRUD', () => {
		const ctrl = createCalendarController({
			timezone: 'UTC',
			initialDate: '2026-03-04T00:00:00Z',
			initialView: 'day',
		})
		let notifications = 0
		const unsubscribe = ctrl.subscribe(() => {
			notifications += 1
		})

		ctrl.nextPeriod()
		expect(ctrl.getState().currentDate).toBe('2026-03-05T00:00:00+00:00')
		ctrl.addEvent({
			id: 'e1',
			title: 'Demo',
			start: '2026-03-05T10:00:00Z',
			end: '2026-03-05T11:00:00Z',
		})
		expect(ctrl.getState().events).toHaveLength(1)
		ctrl.deleteEvent('e1')
		expect(ctrl.getState().events).toHaveLength(0)
		expect(notifications).toBe(3)
		unsubscribe()
	})

	it('anchors offset-less wall-clock event times in event.timezone (#314)', () => {
		// Yukon switched to permanent UTC-7 in Nov 2020. An event with wall-clock
		// '2020-12-01T09:00' and timezone 'America/Whitehorse' reads as 09:00 -07:00
		// (16:00Z) in Whitehorse and 11:00 -05:00 when displayed in New York.
		const normalized = normalizeEvent(
			{
				id: 'yukon',
				title: 'Winter meeting',
				start: '2020-12-01T09:00',
				end: '2020-12-01T10:00',
				timezone: 'America/Whitehorse',
			},
			'America/New_York'
		)

		expect(normalized.start).toBe('2020-12-01T11:00:00-05:00')
		expect(normalized.end).toBe('2020-12-01T12:00:00-05:00')
		expect(normalized.timezone).toBe('America/Whitehorse')
	})

	it('reactively updates timezone, locale, hiddenDays, and events via updateConfig', () => {
		const ctrl = createCalendarController({
			timezone: 'UTC',
			initialDate: '2026-03-04T09:00:00Z',
			initialView: 'week',
			events: [
				{
					id: 'e1',
					title: 'Sync',
					start: '2026-03-04T09:00:00Z',
					end: '2026-03-04T10:00:00Z',
				},
			],
		})
		let notifications = 0
		ctrl.subscribe(() => {
			notifications += 1
		})

		ctrl.updateConfig({
			timezone: 'Asia/Tokyo',
			locale: 'ja-JP',
			weekends: false,
		})

		const next = ctrl.getState()
		expect(next.timezone).toBe('Asia/Tokyo')
		expect(next.locale).toBe('ja-JP')
		expect(next.events.at(0)?.start).toBe('2026-03-04T18:00:00+09:00')
		expect(next.visibleRange.start).toBe('2026-03-02T00:00:00+09:00')
		expect(next.visibleRange.end).toBe('2026-03-06T23:59:59.999+09:00')
		expect(notifications).toBe(1)
	})
})
