import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import { cleanup, render, screen, within } from '@testing-library/react'
import { DayView, WeekView } from '@/features/calendar/components/views'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { singleResource, weekdayBusinessHours } from './resource-test-fixtures'

describe('Resource Calendar Business Hours Integration', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('ResourceWeekHorizontal', () => {
		test('calculates correct dynamic width when hideNonBusinessHours is true', () => {
			const initialDate = dayjs('2025-01-01T00:00:00.000Z') // Wednesday
			const businessHours = weekdayBusinessHours(9, 17)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={initialDate}
					orientation="horizontal"
					resources={singleResource}
				>
					<WeekView />
				</CalendarProvider>
			)

			// Should show business hours (multiple across the week)
			expect(
				screen.getAllByTestId('resource-week-time-label-09').length
			).toBeGreaterThan(0)
			expect(
				screen.getAllByTestId('resource-week-time-label-16').length
			).toBeGreaterThan(0)

			// Should NOT show non-business hours
			expect(
				screen.queryAllByTestId('resource-week-time-label-08').length
			).toBe(0)
			expect(
				screen.queryAllByTestId('resource-week-time-label-17').length
			).toBe(0)
		})
	})

	describe('ResourceDayVertical Weekend Fallback', () => {
		test('falls back to global business hours range on a weekend (Sunday)', () => {
			const sunday = dayjs('2025-01-05T00:00:00.000Z')
			const businessHours = weekdayBusinessHours(10, 16)

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={sunday}
					orientation="vertical"
					resources={singleResource}
				>
					<DayView />
				</CalendarProvider>
			)

			// Even though it's Sunday (not in daysOfWeek), it should show 10-16 range
			// because of the new fallback logic in getViewHours
			expect(screen.getByTestId('vertical-time-10')).toBeInTheDocument()
			expect(screen.getByTestId('vertical-time-15')).toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-09')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-time-16')).not.toBeInTheDocument()
		})
	})

	describe('ResourceDayHorizontal', () => {
		test('hides non-business hours correctly', () => {
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			const businessHours = {
				startTime: 8,
				endTime: 18,
			}

			render(
				<CalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={monday}
					orientation="horizontal"
					resources={singleResource}
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
	describe('Resource Business Hours Union and Precedence', () => {
		test('renders union of business hours and respects resource-specific availability', () => {
			const initialDate = dayjs('2025-01-01T00:00:00.000Z') // Wednesday
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
					initialDate={initialDate}
					orientation="horizontal"
					resources={resources}
				>
					<DayView />
				</CalendarProvider>
			)

			// 1. Verify Union: Should show up to 18:00 (last label 17:00 because it covers 17-18)
			expect(
				screen.getByTestId('resource-day-time-label-17')
			).toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-18')
			).not.toBeInTheDocument()

			// 2. Verify Precedence/Availability:
			// Resource A at 17:00 should be disabled
			const rowA = screen.getByTestId('horizontal-row-A')
			const cellA17 = within(rowA).getByTestId('day-cell-2025-01-01-17-00')
			expect(cellA17.getAttribute('data-disabled')).toBe('true')

			// Resource B at 17:00 should be enabled
			const rowB = screen.getByTestId('horizontal-row-B')
			const cellB17 = within(rowB).getByTestId('day-cell-2025-01-01-17-00')
			expect(cellB17.getAttribute('data-disabled')).toBe('false')
		})
	})
})
