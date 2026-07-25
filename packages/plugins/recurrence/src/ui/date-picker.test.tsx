import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { fireEvent, render, screen } from '@testing-library/react'
import { DatePicker } from './date-picker'

/**
 * `DatePicker` backs the "until" date of a recurring event
 * (`recurrence-end-fields.tsx`), so every one of these paths is user-reachable.
 */
describe('DatePicker', () => {
	const renderPicker = (date?: Date) => {
		const received: (Date | undefined)[] = []
		render(
			<DatePicker
				date={date}
				onChange={(value) => {
					received.push(value)
				}}
			/>
		)
		return {
			input: screen.getByDisplayValue(
				date ? dayjs(date).format('YYYY-MM-DD') : ''
			),
			received,
		}
	}

	it('renders the supplied date in YYYY-MM-DD form', () => {
		const { input } = renderPicker(new Date('2026-03-02T00:00:00'))
		expect(input).toBeInTheDocument()
	})

	/**
	 * Regression test. The component called `dayjs(raw, 'YYYY-MM-DD')`, but the
	 * configured dayjs wrapper forwards every argument to `dayjs.tz()`, whose
	 * second parameter is a TIMEZONE rather than a parse format. That made the
	 * format string be read as a zone name and threw
	 * `RangeError: invalid time zone: YYYY-MM-DD` on every keystroke.
	 */
	it('parses typed input without throwing', () => {
		const { input, received } = renderPicker()
		expect(() => {
			fireEvent.change(input, { target: { value: '2026-03-02' } })
		}).not.toThrow()
		expect(received).toHaveLength(1)
		const parsed = received.at(0)
		expect(parsed).toBeInstanceOf(Date)
		expect(dayjs(parsed).format('YYYY-MM-DD')).toBe('2026-03-02')
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
		expect(dayjs(received.at(0)).format('YYYY-MM-DD')).toBe('2028-02-29')
	})
})
