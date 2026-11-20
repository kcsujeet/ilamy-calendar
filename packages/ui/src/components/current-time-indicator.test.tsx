import { afterEach, describe, expect, it } from 'bun:test'
import { parseDate } from '@ilamy/utils/temporal'
import { cleanup, render } from '@testing-library/react'
import { CurrentTimeIndicator } from './current-time-indicator'

const NEW_YORK = 'America/New_York'

const mustParse = (iso: string) => {
	const parsed = parseDate(iso, NEW_YORK)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

/** The `progress` the indicator hands its renderer for `nowISO` between two midnights. */
const readProgress = (
	midnightISO: string,
	nextMidnightISO: string,
	nowISO: string
) => {
	let progress = Number.NaN
	render(
		<CurrentTimeIndicator
			now={mustParse(nowISO)}
			rangeEnd={mustParse(nextMidnightISO)}
			rangeStart={mustParse(midnightISO)}
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
	const NINE_O_CLOCK_PERCENT = (9 / 24) * 100

	afterEach(() => {
		cleanup()
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
