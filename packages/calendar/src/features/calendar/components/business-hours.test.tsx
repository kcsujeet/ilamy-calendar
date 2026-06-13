import { beforeEach, describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import {
	assertVerticalBusinessHourRange,
	weekdayBusinessHours,
} from '@/testing/resource-test-fixtures'
import { DayView, WeekView } from '@/testing/view-harnesses'

describe('Regular Calendar Business Hours Integration', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('DayView', () => {
		test('falls back to global business hours range on a weekend (Sunday)', () => {
			const sunday = dayjs('2025-01-05T00:00:00.000Z')
			const businessHours = weekdayBusinessHours(10, 16)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={sunday}
				>
					<DayView />
				</CalendarProvider>
			)

			// Should show business range from Monday even though it's Sunday
			assertVerticalBusinessHourRange(screen, 10, 15, 9, 16)
		})
	})

	describe('WeekView', () => {
		test('hides non-business hours consistently across the week', () => {
			const initialDate = dayjs('2025-01-01T00:00:00.000Z') // Wednesday
			const businessHours = weekdayBusinessHours(9, 17)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={initialDate}
				>
					<WeekView />
				</CalendarProvider>
			)

			// Business hours should be present
			expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
			expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()

			// Non-business hours should NOT be present
			expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		})
	})
})
