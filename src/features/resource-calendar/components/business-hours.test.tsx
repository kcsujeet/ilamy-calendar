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

			// 9-17 is 8 hours.
			// The day header should have a width constant based on 8 hours.
			const dayHeader = screen.getAllByTestId('resource-week-day-header')[3] // Wednesday is index 3 in Sunday-started week
			// The actual class is w-[calc(var(--spacing)*20*var(--width-multiplier))]
			// We should check if the style property --width-multiplier is 8
			const style = dayHeader?.getAttribute('style') || ''
			expect(style).toContain('--width-multiplier: 8')

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
})
