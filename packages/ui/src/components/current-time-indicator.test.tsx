import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render } from '@testing-library/react'
// `dayjs.tz` types: this package reads @ilamy/utils from its built declarations.
import type {} from 'dayjs/plugin/timezone'
import { CurrentTimeIndicator } from './current-time-indicator'

/** The `progress` the indicator hands its renderer for `nowISO` between two midnights. */
const readProgress = (
	midnightISO: string,
	nextMidnightISO: string,
	nowISO: string
) => {
	let progress = Number.NaN
	render(
		<CurrentTimeIndicator
			now={dayjs(nowISO)}
			rangeEnd={dayjs(nextMidnightISO)}
			rangeStart={dayjs(midnightISO)}
			render={(props) => {
				progress = props.progress
				return null
			}}
		/>
	)
	return progress
}

/**
 * #311. The line marks the clock time on a grid labelled by clock hour, so at
 * 09:00 it sits 9/24 of the way down whatever the length of the day. By
 * elapsed time it sat beside 8 AM on a 23-hour day and 10 AM on a 25-hour one.
 */
describe('CurrentTimeIndicator on a day the clocks change', () => {
	const originalTz = dayjs.tz.guess()
	const NINE_O_CLOCK_PERCENT = (9 / 24) * 100

	beforeEach(() => {
		dayjs.tz.setDefault('America/New_York')
	})

	afterEach(() => {
		cleanup()
		dayjs.tz.setDefault(originalTz)
	})

	it('marks 09:00 at the 9 AM row on the spring change day', () => {
		const progress = readProgress(
			'2025-03-09T00:00',
			'2025-03-10T00:00',
			'2025-03-09T09:00'
		)
		expect(progress).toBeCloseTo(NINE_O_CLOCK_PERCENT, 6)
	})

	it('marks 09:00 at the 9 AM row on the autumn change day', () => {
		const progress = readProgress(
			'2025-11-02T00:00',
			'2025-11-03T00:00',
			'2025-11-02T09:00'
		)
		expect(progress).toBeCloseTo(NINE_O_CLOCK_PERCENT, 6)
	})

	it('marks 09:00 at the 9 AM row on an ordinary day', () => {
		const progress = readProgress(
			'2025-03-12T00:00',
			'2025-03-13T00:00',
			'2025-03-12T09:00'
		)
		expect(progress).toBeCloseTo(NINE_O_CLOCK_PERCENT, 6)
	})
})
