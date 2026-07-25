import { beforeEach, describe, expect, test } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
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

	describe('sub-hour boundaries', () => {
		const wednesday = dayjs('2025-01-01T00:00:00.000Z')
		const wednesdayKey = wednesday.format('YYYY-MM-DD')
		const subHourBusinessHours: BusinessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: '09:15',
			endTime: '17:15',
		}

		const renderWeek = (props = {}) =>
			render(
				<CalendarProvider
					businessHours={subHourBusinessHours}
					dayMaxEvents={3}
					initialDate={wednesday}
					{...props}
				>
					<WeekView />
				</CalendarProvider>
			)

		const cellDisabled = (hh: string, mm: string) =>
			screen
				.getByTestId(`vertical-cell-${wednesdayKey}-${hh}-${mm}`)
				.getAttribute('data-disabled')

		test('disables hour cells that only partially overlap business hours', () => {
			renderWeek()

			const boundaryCells = [
				cellDisabled('09', '00'),
				cellDisabled('10', '00'),
				cellDisabled('16', '00'),
				cellDisabled('17', '00'),
			]
			expect(boundaryCells).toEqual(['true', 'false', 'false', 'true'])
		})

		test('enables exactly the slots inside the boundary with 15-minute slots', () => {
			renderWeek({ slotDuration: 15 })

			const boundaryCells = [
				cellDisabled('09', '00'),
				cellDisabled('09', '15'),
				cellDisabled('17', '00'),
				cellDisabled('17', '15'),
			]
			expect(boundaryCells).toEqual(['true', 'false', 'false', 'true'])
		})

		test('30-minute slots lose both partial slots at :15 boundaries', () => {
			renderWeek({ slotDuration: 30 })

			const boundaryCells = [
				cellDisabled('09', '00'), // crosses the 9:15 start
				cellDisabled('09', '30'),
				cellDisabled('16', '30'), // ends 17:00 <= 17:15
				cellDisabled('17', '00'), // ends 17:30 > 17:15
			]
			expect(boundaryCells).toEqual(['true', 'false', 'false', 'true'])
		})

		test('hideNonBusinessHours keeps the partial boundary hours visible', () => {
			renderWeek({ hideNonBusinessHours: true })

			expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
			expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-18')).not.toBeInTheDocument()
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
