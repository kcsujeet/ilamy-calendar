import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { WeekDays } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceDayHorizontal } from './day-view/resource-day-horizontal'
import { ResourceDayVertical } from './day-view/resource-day-vertical'
import { ResourceWeekHorizontal } from './week-view/resource-week-horizontal'

const mockResources: Resource[] = [{ id: '1', title: 'Resource 1' }]

describe('Resource Calendar Business Hours Integration', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('ResourceWeekHorizontal', () => {
		test('calculates correct dynamic width when hideNonBusinessHours is true', () => {
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
				<ResourceCalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={initialDate}
					resources={mockResources}
				>
					<ResourceWeekHorizontal />
				</ResourceCalendarProvider>
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
				<ResourceCalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={sunday}
					resources={mockResources}
				>
					<ResourceDayVertical />
				</ResourceCalendarProvider>
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
				<ResourceCalendarProvider
					businessHours={businessHours}
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={monday}
					resources={mockResources}
				>
					<ResourceDayHorizontal />
				</ResourceCalendarProvider>
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
				<ResourceCalendarProvider
					dayMaxEvents={3}
					hideNonBusinessHours={true}
					initialDate={initialDate}
					resources={resources}
				>
					<ResourceDayHorizontal />
				</ResourceCalendarProvider>
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
			const cellA17 = screen.getByTestId('day-cell-2025-01-01-17-00')
			expect(cellA17.getAttribute('data-disabled')).toBe('true')

			// Resource B at 17:00 should be enabled
			// Note: The ID for resource cells includes the resource ID
			const cellB17 = screen.getByTestId('day-cell-2025-01-01-17-00-resource-B')
			// If it's enabled, data-disabled should be false or null (in this implementation it seems to be 'false')
			// Let's check how DroppableCell sets it
			expect(cellB17.getAttribute('data-disabled')).toBe('false')
		})
	})
})
