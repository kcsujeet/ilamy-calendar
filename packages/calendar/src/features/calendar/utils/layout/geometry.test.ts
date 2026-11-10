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
	it('draws the layout width without an independent CSS minimum', () => {
		const style = getHorizontalBarStyle(placement, 0, 24)

		expect(style).toEqual({
			left: 'calc(10% + var(--spacing) * 0.25)',
			width: 'calc(0.3% - var(--spacing) * 1)',
			top: '0px',
			height: '24px',
		})
	})
})
