import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import { cleanup, render, screen, within } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	assertResourceWeekBusinessHourRange,
	assertVerticalBusinessHourRange,
	singleResource,
	weekdayBusinessHours,
} from '@/testing/resource-test-fixtures'
import { DayView, WeekView } from '@/testing/view-harnesses'

describe('Resource Calendar Business Hours Integration', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('ResourceWeekHorizontal', () => {
		test('calculates correct dynamic width when hideNonBusinessHours is true', () => {
			const businessHours = weekdayBusinessHours(9, 17)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate="2025-01-01T00:00:00Z"
					initialView="week"
					orientation="horizontal"
					resources={singleResource}
					timezone="UTC"
				>
					<WeekView />
				</CalendarProvider>
			)

			assertResourceWeekBusinessHourRange(screen, 9, 16, 8, 17)
		})
	})

	describe('ResourceDayVertical Weekend Fallback', () => {
		test('falls back to global business hours range on a weekend (Sunday)', () => {
			const businessHours = weekdayBusinessHours(10, 16)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate="2025-01-05T00:00:00Z"
					initialView="day"
					orientation="vertical"
					resources={singleResource}
					timezone="UTC"
				>
					<DayView />
				</CalendarProvider>
			)

			assertVerticalBusinessHourRange(screen, 10, 15, 9, 16)
		})
	})

	describe('ResourceDayHorizontal', () => {
		test('hides non-business hours correctly', () => {
			render(
				<CalendarProvider
					businessHours={{ startTime: 8, endTime: 18 }}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate="2025-01-06T00:00:00Z"
					initialView="day"
					orientation="horizontal"
					resources={singleResource}
					timezone="UTC"
				>
					<DayView />
				</CalendarProvider>
			)

			expect(
				screen.getByTestId('resource-day-time-label-08')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-17')
			).toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-07')
			).not.toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-18')
			).not.toBeInTheDocument()
		})
	})

	describe('Resource Business Hours Union and Precedence (4.0.5)', () => {
		test('renders union of business hours and shades resource-specific non-business hours', () => {
			const resources: Resource[] = [
				{
					id: 'A',
					title: 'Resource A',
					businessHours: { startTime: 9, endTime: 17 },
				},
				{
					id: 'B',
					title: 'Resource B',
					businessHours: { startTime: 9, endTime: 18 },
				},
			]

			render(
				<CalendarProvider
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate="2025-01-01T00:00:00Z"
					initialView="day"
					orientation="horizontal"
					resources={resources}
					timezone="UTC"
				>
					<DayView />
				</CalendarProvider>
			)

			expect(
				screen.getByTestId('resource-day-time-label-17')
			).toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-18')
			).not.toBeInTheDocument()

			const rowA = screen.getByTestId('horizontal-row-A')
			const cellA17 = within(rowA).getByTestId('day-cell-2025-01-01-17-00')
			expect(cellA17.getAttribute('data-non-business')).toBe('true')
			expect(cellA17.getAttribute('data-disabled')).toBe('false')

			const rowB = screen.getByTestId('horizontal-row-B')
			const cellB17 = within(rowB).getByTestId('day-cell-2025-01-01-17-00')
			expect(cellB17.getAttribute('data-non-business')).toBeNull()
			expect(cellB17.getAttribute('data-disabled')).toBe('false')
		})
	})
})
