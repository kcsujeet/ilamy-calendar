import { describe, expect, it } from 'bun:test'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import {
	dayKey,
	endOf,
	isBefore,
	parseDate,
	resolveZone,
	withTime,
} from '@ilamy/utils/temporal'
import { fireEvent, render, screen } from '@testing-library/react'
import { DateInput } from './date-input'

/**
 * `DateInput` backs the "until" date of a recurring event
 * (`recurrence-end-fields.tsx`), so every one of these paths is user-reachable.
 */
describe('DateInput', () => {
	const renderPicker = (date?: Date, timezone?: string) => {
		const zone = resolveZone(timezone)
		const parsedInitial = date ? parseDate(date, zone) : undefined
		const received: (Date | undefined)[] = []
		render(
			<CalendarTestProvider timezone={timezone}>
				<DateInput
					date={date}
					onChange={(value) => {
						received.push(value)
					}}
				/>
			</CalendarTestProvider>
		)
		return {
			input: screen.getByDisplayValue(
				parsedInitial ? dayKey(parsedInitial) : ''
			),
			received,
		}
	}

	it('renders the supplied date in YYYY-MM-DD form', () => {
		const { input } = renderPicker(new Date('2026-03-02T00:00:00'))
		expect(input).toBeInTheDocument()
	})

	it('parses typed input without throwing', () => {
		const { input, received } = renderPicker()
		expect(() => {
			fireEvent.change(input, { target: { value: '2026-03-02' } })
		}).not.toThrow()
		expect(received).toHaveLength(1)
		const parsed = received.at(0)
		expect(parsed).toBeInstanceOf(Date)
		const zoned = parsed ? parseDate(parsed, resolveZone()) : undefined
		expect(zoned ? dayKey(zoned) : '').toBe('2026-03-02')
	})

	it('reports undefined when the field is cleared', () => {
		const { input, received } = renderPicker(new Date('2026-03-02T00:00:00'))
		fireEvent.change(input, { target: { value: '' } })
		expect(received).toEqual([undefined])
	})

	it('reports undefined for an unparseable value', () => {
		const { input, received } = renderPicker()
		fireEvent.change(input, { target: { value: 'not-a-date' } })
		expect(received).toEqual([undefined])
	})

	it('handles a leap day', () => {
		const { input, received } = renderPicker()
		fireEvent.change(input, { target: { value: '2028-02-29' } })
		const parsed = received.at(0)
		const zoned = parsed ? parseDate(parsed, resolveZone()) : undefined
		expect(zoned ? dayKey(zoned) : '').toBe('2028-02-29')
	})

	describe('configured timezone', () => {
		it('reports start of day in the calendar timezone', () => {
			const { input, received } = renderPicker(undefined, 'Asia/Tokyo')

			fireEvent.change(input, { target: { value: '2026-03-02' } })

			expect(received.at(0)?.toISOString()).toBe('2026-03-01T15:00:00.000Z')
		})

		it('survives the endOf-day round trip its consumer applies', () => {
			const { input, received } = renderPicker(undefined, 'Asia/Tokyo')

			fireEvent.change(input, { target: { value: '2026-03-02' } })
			const parsed = received.at(0)
			const untilStart = parsed ? parseDate(parsed, 'Asia/Tokyo') : undefined
			const lastOccurrenceDay = parseDate('2026-03-02', 'Asia/Tokyo')
			if (!(untilStart && lastOccurrenceDay)) {
				throw new Error('Expected parsed Tokyo dates')
			}
			const until = endOf(untilStart, 'day')
			const lastOccurrence = withTime(lastOccurrenceDay, { hour: 23 })

			expect(dayKey(until)).toBe('2026-03-02')
			expect(isBefore(lastOccurrence, until)).toBe(true)
		})
	})
})
