import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from './geometry'

const event: CalendarEvent = {
	id: 'bar',
	title: 'bar',
	start: dayjs('2025-01-13T10:00:00.000Z'),
	end: dayjs('2025-01-13T10:05:00.000Z'),
}

const placement: HorizontalPositionedEvent = {
	kind: 'horizontal',
	event,
	left: 10,
	width: 0.3,
	row: 0,
	isTruncatedStart: false,
	isTruncatedEnd: false,
}

describe('getHorizontalBarStyle', () => {
	/**
	 * A bar sized by its exact time can be a sliver, so it keeps a minimum width,
	 * as FullCalendar's timeline does (`eventMinWidth`, "the minimum width an
	 * event is allowed to be"). It is on the consumer's own spacing scale, like
	 * the hour columns (`min-w-20`), so the two keep their proportion whatever
	 * `--spacing` the consumer's theme sets.
	 */
	it('keeps a bar at least eight spacing units wide', () => {
		const style = getHorizontalBarStyle(placement, 0, 24)

		expect(style.minWidth).toBe('calc(var(--spacing) * 8)')
	})
})
