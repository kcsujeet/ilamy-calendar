import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { WeekDays } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import DayView from './day-view/day-view'
import WeekView from './week-view/week-view'

describe('Regular Calendar Business Hours Integration', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('DayView', () => {
		test('falls back to global business hours range on a weekend (Sunday)', () => {
			const sunday = dayjs('2025-01-05T00:00:00.000Z')
			const businessHours = {
				daysOfWeek: [
					'monday',
					'tuesday',
					'wednesday',
					'thursday',
					'friday',
				] as WeekDays[],
				startTime: 10,
				endTime: 16,
			}

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
			expect(screen.getByTestId('vertical-time-10')).toBeInTheDocument()
			expect(screen.getByTestId('vertical-time-15')).toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-09')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-16')).not.toBeInTheDocument()
		})
	})

	describe('WeekView', () => {
		test('hides non-business hours consistently across the week', () => {
			const initialDate = dayjs('2025-01-01T00:00:00.000Z') // Wednesday
			const businessHours = {
				daysOfWeek: [
					'monday',
					'tuesday',
					'wednesday',
					'thursday',
					'friday',
				] as WeekDays[],
				startTime: 9,
				endTime: 17,
			}

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
