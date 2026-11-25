/** @jsxImportSource preact */
import { afterEach, describe, expect, it } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import {
	dayKey,
	endOf,
	isBefore,
	parseDate,
	resolveZone,
	withTime,
} from '../../../../utils/temporal'
import { DateInput } from './date-input'

describe('DateInput', () => {
	const containers: HTMLElement[] = []

	afterEach(() => {
		for (const el of containers.splice(0)) {
			preactRender(null, el)
			el.remove()
		}
	})

	const renderPicker = (date?: Date, timezone?: string) => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		containers.push(container)
		const zone = resolveZone(timezone)
		const parsedInitial = date ? parseDate(date, zone) : undefined
		const received: (Date | undefined)[] = []
		act(() => {
			preactRender(
				<DateInput
					date={date}
					onChange={(value) => {
						received.push(value)
					}}
					timezone={timezone}
				/>,
				container
			)
		})
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
			act(() => {
				fireEvent.change(input, { target: { value: '2026-03-02' } })
			})
		}).not.toThrow()
		expect(received).toHaveLength(1)
		const parsed = received.at(0)
		expect(parsed).toBeInstanceOf(Date)
		const zoned = parsed ? parseDate(parsed, resolveZone()) : undefined
		expect(zoned ? dayKey(zoned) : '').toBe('2026-03-02')
	})

	it('reports undefined when the field is cleared', () => {
		const { input, received } = renderPicker(new Date('2026-03-02T00:00:00'))
		act(() => {
			fireEvent.change(input, { target: { value: '' } })
		})
		expect(received).toEqual([undefined])
	})

	it('reports undefined for an unparseable value', () => {
		const { input, received } = renderPicker()
		act(() => {
			fireEvent.change(input, { target: { value: 'not-a-date' } })
		})
		expect(received).toEqual([undefined])
	})

	it('handles a leap day', () => {
		const { input, received } = renderPicker()
		act(() => {
			fireEvent.change(input, { target: { value: '2028-02-29' } })
		})
		const parsed = received.at(0)
		const zoned = parsed ? parseDate(parsed, resolveZone()) : undefined
		expect(zoned ? dayKey(zoned) : '').toBe('2028-02-29')
	})

	describe('configured timezone', () => {
		it('reports start of day in the calendar timezone', () => {
			const { input, received } = renderPicker(undefined, 'Asia/Tokyo')

			act(() => {
				fireEvent.change(input, { target: { value: '2026-03-02' } })
			})

			expect(received.at(0)?.toISOString()).toBe('2026-03-01T15:00:00.000Z')
		})

		it('survives the endOf-day round trip its consumer applies', () => {
			const { input, received } = renderPicker(undefined, 'Asia/Tokyo')

			act(() => {
				fireEvent.change(input, { target: { value: '2026-03-02' } })
			})
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
