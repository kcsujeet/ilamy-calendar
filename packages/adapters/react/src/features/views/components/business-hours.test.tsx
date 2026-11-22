import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
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
			const sunday = '2025-01-05T00:00:00Z'
			const businessHours = weekdayBusinessHours(10, 16)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={sunday}
					initialView="day"
					timezone="UTC"
				>
					<DayView />
				</CalendarProvider>
			)

			// Should show business range from Monday even though it's Sunday
			assertVerticalBusinessHourRange(screen, 10, 15, 9, 16)
		})
	})

	describe('sub-hour boundaries (4.0.5 shading without disabling)', () => {
		const wednesday = '2025-01-01T00:00:00Z'
		const wednesdayKey = '2025-01-01'
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
					initialView="week"
					timezone="UTC"
					{...props}
				>
					<WeekView />
				</CalendarProvider>
			)

		const cellShaded = (hh: string, mm: string) =>
			screen
				.getByTestId(`vertical-cell-${wednesdayKey}-${hh}-${mm}`)
				.getAttribute('data-non-business')

		const cellDisabled = (hh: string, mm: string) =>
			screen
				.getByTestId(`vertical-cell-${wednesdayKey}-${hh}-${mm}`)
				.getAttribute('data-disabled')

		test('shades hour cells that only partially overlap business hours without disabling clicks', () => {
			const onCellClick = mock()
			renderWeek({ onCellClick })

			expect([
				cellShaded('09', '00'),
				cellShaded('10', '00'),
				cellShaded('16', '00'),
				cellShaded('17', '00'),
			]).toEqual(['true', null, null, 'true'])

			expect([
				cellDisabled('09', '00'),
				cellDisabled('10', '00'),
				cellDisabled('16', '00'),
				cellDisabled('17', '00'),
			]).toEqual(['false', 'false', 'false', 'false'])

			fireEvent.click(screen.getByTestId(`vertical-cell-${wednesdayKey}-09-00`))
			expect(onCellClick).toHaveBeenCalledTimes(1)
		})

		test('leaves exactly the slots inside the boundary unshaded with 15-minute slots', () => {
			renderWeek({ slotDuration: 15 })

			expect([
				cellShaded('09', '00'),
				cellShaded('09', '15'),
				cellShaded('17', '00'),
				cellShaded('17', '15'),
			]).toEqual(['true', null, null, 'true'])
		})

		test('30-minute slots shade both partial slots at :15 boundaries', () => {
			renderWeek({ slotDuration: 30 })

			expect([
				cellShaded('09', '00'), // crosses the 9:15 start
				cellShaded('09', '30'),
				cellShaded('16', '30'), // ends 17:00 <= 17:15
				cellShaded('17', '00'), // ends 17:30 > 17:15
			]).toEqual(['true', null, null, 'true'])
		})

		test('defaults daysOfWeek to Monday-Friday when omitted on an object (4.0.5)', () => {
			renderWeek({
				businessHours: { startTime: '09:00', endTime: '17:00' },
			})

			// Wednesday 10:00 is business; Sunday 2024-12-29 10:00 is shaded non-business
			expect(cellShaded('10', '00')).toBeNull()
			expect(
				screen
					.getByTestId('vertical-cell-2024-12-29-10-00')
					.getAttribute('data-non-business')
			).toBe('true')
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
			const initialDate = '2025-01-01T00:00:00Z' // Wednesday
			const businessHours = weekdayBusinessHours(9, 17)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={initialDate}
					initialView="week"
					timezone="UTC"
				>
					<WeekView />
				</CalendarProvider>
			)

			expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
			expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()

			expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		})
	})
})
