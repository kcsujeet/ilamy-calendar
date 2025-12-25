import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import dayjs from '@/lib/configs/dayjs-config'
import { CurrentTimeIndicator } from './current-time-indicator'

const renderCurrentTimeIndicator = (props: {
	rangeStart: dayjs.Dayjs
	rangeEnd: dayjs.Dayjs
	now?: dayjs.Dayjs
}) => {
	return render(<CurrentTimeIndicator {...props} />)
}

describe('CurrentTimeIndicator', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders correctly in a vertical time range (e.g. Day View column)', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		// 10:30 (50% progress into the 60 min range)
		const now = dayjs('2025-01-01T10:30:00.000Z')

		renderCurrentTimeIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('50%')
	})

	test('renders correctly in a multi-hour range', () => {
		const rangeStart = dayjs('2025-01-01T00:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'day') // 24 hours
		// 6:00 AM (25% progress into the day)
		const now = dayjs('2025-01-01T06:00:00.000Z')

		renderCurrentTimeIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('25%')
	})

	test('does not render if now is before range', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T09:59:59.999Z')

		renderCurrentTimeIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('does not render if now is after range', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T11:00:00.000Z')

		renderCurrentTimeIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('respects date boundaries', () => {
		const jan1 = dayjs('2025-01-01T00:00:00.000Z')
		const jan1End = jan1.add(1, 'day')
		const jan2 = dayjs('2025-01-02T00:00:00.000Z')
		const jan2End = jan2.add(1, 'day')

		// "now" is Jan 1, 12:00
		const now = dayjs('2025-01-01T12:00:00.000Z')

		const { rerender } = renderCurrentTimeIndicator({
			rangeStart: jan1,
			rangeEnd: jan1End,
			now,
		})
		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()

		// Jan 2 range should not show indicator when "now" is Jan 1
		rerender(
			<CurrentTimeIndicator now={now} rangeEnd={jan2End} rangeStart={jan2} />
		)
		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})
})
