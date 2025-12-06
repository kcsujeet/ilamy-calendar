import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { generateMockEvents } from '@/lib/utils/generator'
import WeekView from './week-view'

const weekDays: string[] = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
]

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents()
const firstDayOfWeek = 0 // Default to Sunday
const dayMaxEvents = 3 // Default max events per day
let locale = 'en' // Default locale

// Test component to capture context values
const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId: string
}) => {
	const { currentDate } = useCalendarContext()
	return (
		<>
			<div data-testid={`${testId}-year`}>{currentDate.year()}</div>
			<div data-testid={`${testId}-month`}>{currentDate.month()}</div>
			<div data-testid={`${testId}-date`}>{currentDate.date()}</div>
			{children}
		</>
	)
}

const renderWeekView = (props = {}) => {
	const testId = 'current-date'
	return render(
		<CalendarProvider
			firstDayOfWeek={firstDayOfWeek}
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			locale={locale}
			{...props}
		>
			<TestWrapper testId={testId}>
				<WeekView />
			</TestWrapper>
		</CalendarProvider>
	)
}

describe('WeekView', () => {
	beforeEach(() => {
		// Reset the dayjs locale to default before each test
		locale = 'en'

		// render the WeekView with default props
		renderWeekView()
	})

	test('renders week view structure with proper layout', () => {
		// Should have the main container structure
		const container = screen.getByTestId('week-view')
		expect(container).toBeInTheDocument()

		// Should have week header structure
		const headerContainer = screen.getByTestId('week-header')
		expect(headerContainer).toBeInTheDocument()

		// Should have all-day row structure
		const allDayContainer = screen.getByTestId('week-all-day-row')
		expect(allDayContainer).toBeInTheDocument()

		// Should have time grid structure
		const timeGridContainer = screen.getByTestId('week-time-grid')
		expect(timeGridContainer).toBeInTheDocument()
	})

	test('renders WeekView with correct weekday headers starting from Sunday', () => {
		// Check that all weekday headers are present using test IDs
		weekDays.forEach((day) => {
			expect(
				screen.getByTestId(`week-day-header-${day.toLowerCase()}`)
			).toBeInTheDocument()
		})
	})

	test('renders WeekView with correct weekday headers starting from Monday', () => {
		cleanup() // Clean up previous renders
		renderWeekView({ firstDayOfWeek: 1 }) // Set Monday as first day of week

		// When starting from Monday, all weekdays should still be present
		weekDays.forEach((day) => {
			expect(
				screen.getByTestId(`week-day-header-${day.toLowerCase()}`)
			).toBeInTheDocument()
		})
	})

	test('displays current week dates correctly', () => {
		// Get the current week's start and end dates
		const currentWeek = dayjs().startOf('week')
		const weekStart = currentWeek.date()
		const weekEnd = currentWeek.add(6, 'day').date()

		// Should find the start and end dates of the current week
		const startDateElements = screen.getAllByText(weekStart.toString())
		const endDateElements = screen.getAllByText(weekEnd.toString())

		expect(startDateElements.length).toBeGreaterThan(0)
		expect(endDateElements.length).toBeGreaterThan(0)
	})

	test('handles events display in week structure', () => {
		// Should render the week structure
		expect(screen.getByTestId('week-view')).toBeInTheDocument()

		// Should have the time grid for events
		expect(screen.getByTestId('week-time-grid')).toBeInTheDocument()

		// Should have all-day row for all-day events
		expect(screen.getByTestId('week-all-day-row')).toBeInTheDocument()
	})

	test('renders with proper scrollable time grid', () => {
		// Check for scrollable container
		const scrollArea = screen.getByTestId('week-scroll-area')
		expect(scrollArea).toBeInTheDocument()

		// Check for time grid within scroll area
		const timeGrid = screen.getByTestId('week-time-grid')
		expect(timeGrid).toBeInTheDocument()
	})

	test('respects firstDayOfWeek prop', () => {
		cleanup() // Clean up previous renders
		renderWeekView({ firstDayOfWeek: 1 }) // Set Monday as first day

		// Check that Monday header is present (order will be handled by component logic)
		expect(screen.getByTestId('week-day-header-monday')).toBeInTheDocument()
		expect(screen.getByTestId('week-day-header-sunday')).toBeInTheDocument()
	})

	test('handles different locale settings', () => {
		cleanup() // Clean up previous renders
		renderWeekView({ locale: 'en' })

		// Should render with English locale by default using test IDs
		expect(screen.getByTestId('week-day-header-sunday')).toBeInTheDocument()
		expect(screen.getByTestId('week-day-header-monday')).toBeInTheDocument()
	})

	test('renders time slots structure', () => {
		// Should have time grid for the day
		const timeGrid = screen.getByTestId('week-time-grid')
		expect(timeGrid).toBeInTheDocument()

		// Should have time labels column
		const timeLabels = screen.getByTestId('week-time-labels')
		expect(timeLabels).toBeInTheDocument()

		// Should have specific hour slots
		expect(screen.getByTestId('week-time-hour-00')).toBeInTheDocument()
		expect(screen.getByTestId('week-time-hour-12')).toBeInTheDocument()
		expect(screen.getByTestId('week-time-hour-23')).toBeInTheDocument()
	})

	test('renders day columns for the week', () => {
		// Get current week's dates
		const startOfWeek = dayjs().startOf('week')

		// Should have 7 day columns for the week
		for (let i = 0; i < 7; i++) {
			const dayDate = startOfWeek.add(i, 'day')
			const dayColTestId = `week-day-col-${dayDate.format('YYYY-MM-DD')}`
			expect(screen.getByTestId(dayColTestId)).toBeInTheDocument()
		}
	})

	test('renders time cells for each day', () => {
		const startOfWeek = dayjs().startOf('week')
		const firstDay = startOfWeek.format('YYYY-MM-DD')

		// Check for some time cells on the first day
		expect(
			screen.getByTestId(`week-time-cell-${firstDay}-00`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`week-time-cell-${firstDay}-12`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`week-time-cell-${firstDay}-23`)
		).toBeInTheDocument()
	})

	test('renders event layers for each day', () => {
		const startOfWeek = dayjs().startOf('week')

		for (let i = 0; i < 7; i++) {
			const dayDate = startOfWeek.add(i, 'day')
			const eventsTestId = `week-day-events-${dayDate.format('YYYY-MM-DD')}`
			expect(screen.getByTestId(eventsTestId)).toBeInTheDocument()
		}
	})

	test('initializes with specified initial date - different week', () => {
		cleanup()
		const initialDate = dayjs('2025-06-15T10:00:00.000Z')
		renderWeekView({ initialDate })

		// Should have currentDate set to June 2025 (month 5, 0-indexed)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

		// Should have the specific date for June 15, 2025
		const june15Events = screen.getByTestId('week-day-events-2025-06-15')
		expect(june15Events).toBeInTheDocument()
	})

	test('initializes with specified initial date - past date', () => {
		cleanup()
		const initialDate = dayjs('2020-01-15T10:00:00.000Z')
		renderWeekView({ initialDate })

		// Should have currentDate set to January 2020 (month 0)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('0')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

		// Should have the specific date for January 15, 2020
		const jan15Events = screen.getByTestId('week-day-events-2020-01-15')
		expect(jan15Events).toBeInTheDocument()
	})

	test('initializes with specified initial date - future date', () => {
		cleanup()
		const initialDate = dayjs('2030-12-25T10:00:00.000Z')
		renderWeekView({ initialDate })

		// Should have currentDate set to December 2030 (month 11)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('11')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')

		// Should have the specific date for December 25, 2030
		const dec25Events = screen.getByTestId('week-day-events-2030-12-25')
		expect(dec25Events).toBeInTheDocument()
	})

	test('defaults to current week when no initial date provided', () => {
		cleanup()
		const today = dayjs()
		renderWeekView()

		// Should have currentDate set to today
		expect(screen.getByTestId('current-date-year')).toHaveTextContent(
			today.year().toString()
		)
		expect(screen.getByTestId('current-date-month')).toHaveTextContent(
			today.month().toString()
		)
		expect(screen.getByTestId('current-date-date')).toHaveTextContent(
			today.date().toString()
		)

		// Should have events container for today
		const todayEvents = screen.getByTestId(
			`week-day-events-${today.format('YYYY-MM-DD')}`
		)
		expect(todayEvents).toBeInTheDocument()
	})

	test('all-day event ending on Sunday should not appear on Monday when firstDayOfWeek is Monday', () => {
		cleanup()

		// Create all-day event from Nov 17 to Nov 23 (Sunday)
		const allDayEvent: CalendarEvent = {
			id: 'all-day-event-nov-17-23',
			title: 'Week-long Event',
			start: dayjs('2025-11-17T00:00:00.000Z'), // Monday Nov 17
			end: dayjs('2025-11-23T23:59:59.999Z'), // Sunday Nov 23
			allDay: true,
			color: 'blue',
		}

		// Set current date to Nov 24 (Monday) to view the week containing Nov 23
		const currentDate = dayjs('2025-11-24T00:00:00.000Z')

		renderWeekView({
			firstDayOfWeek: 1, // Monday as first day
			initialDate: currentDate,
			events: [allDayEvent],
		})

		// The week starting Nov 24 (Monday) should be: Nov 24-30
		// The event ends on Nov 23 (Sunday), which is in the PREVIOUS week (Nov 17-23)
		// Therefore, the event should NOT appear in this week view

		// Check that the all-day row exists
		const allDayRow = screen.getByTestId('week-all-day-row')
		expect(allDayRow).toBeInTheDocument()

		// The event should not be rendered because it ends before this week starts
		const eventElement = screen.queryByText('Week-long Event')
		expect(eventElement).not.toBeInTheDocument()
	})

	test('all-day event spanning the exact week should render correctly when firstDayOfWeek is Monday', () => {
		cleanup()

		// Create all-day event from Monday to Sunday of the same week
		const allDayEvent: CalendarEvent = {
			id: 'all-day-event-full-week',
			title: 'Full Week Event',
			start: dayjs('2025-11-17T00:00:00.000Z'), // Monday Nov 17
			end: dayjs('2025-11-23T23:59:59.999Z'), // Sunday Nov 23
			allDay: true,
			color: 'green',
		}

		// Set current date to Nov 20 (Thursday) to view the week containing this event
		const currentDate = dayjs('2025-11-20T00:00:00.000Z')

		renderWeekView({
			firstDayOfWeek: 1, // Monday as first day
			initialDate: currentDate,
			events: [allDayEvent],
		})

		// The week should be Nov 17-23 (Monday to Sunday)
		// The event should span the entire week
		const eventElement = screen.getByText('Full Week Event')
		expect(eventElement).toBeInTheDocument()
	})

	test('applies business hours styling correctly', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderWeekView({
			initialDate: monday,
			businessHours,
		})

		// Monday 10am should be business hour (hover:bg-accent)
		const businessCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-10`
		)
		expect(businessCell.className).toContain('hover:bg-accent')
		expect(businessCell.className).not.toContain('bg-muted/30')
		expect(businessCell.className).toContain('cursor-pointer')

		// Monday 8am should be non-business hour (bg-secondary)
		const nonBusinessCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-08`
		)
		expect(nonBusinessCell.className).toContain('bg-secondary')
		expect(nonBusinessCell.className).toContain('text-muted-foreground')
		expect(nonBusinessCell.className).not.toContain('hover:bg-muted/50')
		expect(nonBusinessCell.className).toContain('cursor-default')

		// Sunday should be non-business day
		const sunday = monday.subtract(1, 'day')
		const sundayCell = screen.getByTestId(
			`week-time-cell-${sunday.format('YYYY-MM-DD')}-10`
		)
		expect(sundayCell.className).toContain('bg-secondary')
		expect(sundayCell.className).toContain('text-muted-foreground')
		expect(sundayCell.className).toContain('cursor-default')
	})

	test('applies styling at exact boundary times (9am start, 5pm end)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderWeekView({
			initialDate: monday,
			businessHours,
		})

		// Exactly at 9am (startTime) - Should be business hour
		const startBoundaryCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-09`
		)
		expect(startBoundaryCell.className).toContain('hover:bg-accent')
		expect(startBoundaryCell.className).not.toContain('bg-secondary')
		expect(startBoundaryCell.className).toContain('cursor-pointer')

		// Exactly at 5pm (endTime) - Should be non-business hour (endTime is exclusive)
		const endBoundaryCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-17`
		)
		expect(endBoundaryCell.className).toContain('bg-secondary')
		expect(endBoundaryCell.className).toContain('text-muted-foreground')
		expect(endBoundaryCell.className).toContain('cursor-default')

		// 4pm (one hour before endTime) - Should be business hour
		const beforeEndCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-16`
		)
		expect(beforeEndCell.className).toContain('hover:bg-accent')
		expect(beforeEndCell.className).not.toContain('bg-secondary')
		expect(beforeEndCell.className).toContain('cursor-pointer')

		// 8am (one hour before startTime) - Should be non-business hour
		const beforeStartCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-08`
		)
		expect(beforeStartCell.className).toContain('bg-secondary')
		expect(beforeStartCell.className).toContain('text-muted-foreground')
		expect(beforeStartCell.className).toContain('cursor-default')
	})

	test('respects businessHours with firstDayOfWeek=Monday', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderWeekView({
			initialDate: monday,
			firstDayOfWeek: 1, // Monday
			businessHours,
		})

		// Monday 10am - Business hour
		const mondayCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-10`
		)
		expect(mondayCell.className).toContain('hover:bg-accent')
		expect(mondayCell.className).not.toContain('bg-secondary')

		// Friday 10am - Business hour
		const friday = monday.add(4, 'day')
		const fridayCell = screen.getByTestId(
			`week-time-cell-${friday.format('YYYY-MM-DD')}-10`
		)
		expect(fridayCell.className).toContain('hover:bg-accent')
		expect(fridayCell.className).not.toContain('bg-secondary')

		// Saturday 10am - Non-business day
		const saturday = monday.add(5, 'day')
		const saturdayCell = screen.getByTestId(
			`week-time-cell-${saturday.format('YYYY-MM-DD')}-10`
		)
		expect(saturdayCell.className).toContain('bg-secondary')
		expect(saturdayCell.className).toContain('text-muted-foreground')

		// Sunday 10am - Non-business day
		const sunday = monday.add(6, 'day')
		const sundayCell = screen.getByTestId(
			`week-time-cell-${sunday.format('YYYY-MM-DD')}-10`
		)
		expect(sundayCell.className).toContain('bg-secondary')
		expect(sundayCell.className).toContain('text-muted-foreground')
	})

	test('respects businessHours with firstDayOfWeek=Sunday', () => {
		cleanup()
		const sunday = dayjs('2025-01-05T00:00:00.000Z') // Sunday
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderWeekView({
			initialDate: sunday,
			firstDayOfWeek: 0, // Sunday
			businessHours,
		})

		// Sunday 10am - Non-business day (even though it's first day of week)
		const sundayCell = screen.getByTestId(
			`week-time-cell-${sunday.format('YYYY-MM-DD')}-10`
		)
		expect(sundayCell.className).toContain('bg-secondary')
		expect(sundayCell.className).toContain('text-muted-foreground')

		// Monday 10am - Business hour
		const monday = sunday.add(1, 'day')
		const mondayCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-10`
		)
		expect(mondayCell.className).toContain('hover:bg-accent')
		expect(mondayCell.className).not.toContain('bg-secondary')

		// Saturday 10am - Non-business day
		const saturday = sunday.add(6, 'day')
		const saturdayCell = screen.getByTestId(
			`week-time-cell-${saturday.format('YYYY-MM-DD')}-10`
		)
		expect(saturdayCell.className).toContain('bg-secondary')
		expect(saturdayCell.className).toContain('text-muted-foreground')
	})

	test('handles custom business hours (Tuesday-Thursday, 10am-3pm)', () => {
		cleanup()
		const tuesday = dayjs('2025-01-07T00:00:00.000Z') // Tuesday
		const businessHours = {
			daysOfWeek: ['tuesday', 'wednesday', 'thursday'],
			startTime: 10,
			endTime: 15, // 3pm
		}

		renderWeekView({
			initialDate: tuesday,
			businessHours,
		})

		// Tuesday 11am - Business hour
		const tuesdayBusinessCell = screen.getByTestId(
			`week-time-cell-${tuesday.format('YYYY-MM-DD')}-11`
		)
		expect(tuesdayBusinessCell.className).toContain('hover:bg-accent')
		expect(tuesdayBusinessCell.className).not.toContain('bg-secondary')

		// Tuesday 9am - Non-business hour (before start)
		const tuesdayEarlyCell = screen.getByTestId(
			`week-time-cell-${tuesday.format('YYYY-MM-DD')}-09`
		)
		expect(tuesdayEarlyCell.className).toContain('bg-secondary')
		expect(tuesdayEarlyCell.className).toContain('text-muted-foreground')

		// Tuesday 4pm - Non-business hour (after end)
		const tuesdayLateCell = screen.getByTestId(
			`week-time-cell-${tuesday.format('YYYY-MM-DD')}-16`
		)
		expect(tuesdayLateCell.className).toContain('bg-secondary')
		expect(tuesdayLateCell.className).toContain('text-muted-foreground')

		// Monday 11am - Non-business day
		const monday = tuesday.subtract(1, 'day')
		const mondayCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-11`
		)
		expect(mondayCell.className).toContain('bg-secondary')
		expect(mondayCell.className).toContain('text-muted-foreground')

		// Friday 11am - Non-business day
		const friday = tuesday.add(3, 'day')
		const fridayCell = screen.getByTestId(
			`week-time-cell-${friday.format('YYYY-MM-DD')}-11`
		)
		expect(fridayCell.className).toContain('bg-secondary')
		expect(fridayCell.className).toContain('text-muted-foreground')
	})

	test('handles edge case: businessHours with single day', () => {
		cleanup()
		const wednesday = dayjs('2025-01-08T00:00:00.000Z') // Wednesday
		const businessHours = {
			daysOfWeek: ['wednesday'],
			startTime: 9,
			endTime: 17,
		}

		renderWeekView({
			initialDate: wednesday,
			businessHours,
		})

		// Wednesday 10am - Business hour
		const wednesdayCell = screen.getByTestId(
			`week-time-cell-${wednesday.format('YYYY-MM-DD')}-10`
		)
		expect(wednesdayCell.className).toContain('hover:bg-accent')
		expect(wednesdayCell.className).not.toContain('bg-secondary')

		// Tuesday 10am - Non-business day
		const tuesday = wednesday.subtract(1, 'day')
		const tuesdayCell = screen.getByTestId(
			`week-time-cell-${tuesday.format('YYYY-MM-DD')}-10`
		)
		expect(tuesdayCell.className).toContain('bg-secondary')
		expect(tuesdayCell.className).toContain('text-muted-foreground')

		// Thursday 10am - Non-business day
		const thursday = wednesday.add(1, 'day')
		const thursdayCell = screen.getByTestId(
			`week-time-cell-${thursday.format('YYYY-MM-DD')}-10`
		)
		expect(thursdayCell.className).toContain('bg-secondary')
		expect(thursdayCell.className).toContain('text-muted-foreground')
	})

	test('handles no businessHours prop (all times are clickable)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday

		renderWeekView({
			initialDate: monday,
			// No businessHours prop
		})

		// Monday 10am - Should be clickable (no business hours restriction)
		const mondayCell = screen.getByTestId(
			`week-time-cell-${monday.format('YYYY-MM-DD')}-10`
		)
		expect(mondayCell.className).toContain('hover:bg-accent')
		expect(mondayCell.className).not.toContain('bg-secondary')
		expect(mondayCell.className).toContain('cursor-pointer')

		// Sunday 10am - Should be clickable (no business hours restriction)
		const sunday = monday.subtract(1, 'day')
		const sundayCell = screen.getByTestId(
			`week-time-cell-${sunday.format('YYYY-MM-DD')}-10`
		)
		expect(sundayCell.className).toContain('hover:bg-accent')
		expect(sundayCell.className).not.toContain('bg-secondary')
		expect(sundayCell.className).toContain('cursor-pointer')
	})

	test('displays time labels in 24-hour format when timeFormat is 24-hour', () => {
		cleanup()
		renderWeekView({ timeFormat: '24-hour' })

		// Check that times are displayed in 24-hour format
		// 00:00 should show as "0" or "00" in 24-hour format (no minutes for on-the-hour)
		const midnightHour = screen.getByTestId('week-time-hour-00')
		const midnightText = midnightHour.textContent || ''
		// In 24-hour format, should not contain AM/PM
		expect(midnightText).not.toMatch(/AM|PM/i)

		// 12:00 should show as "12" in 24-hour format (noon)
		const noonHour = screen.getByTestId('week-time-hour-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).not.toMatch(/AM|PM/i)

		// 13:00 should show as "13" in 24-hour format
		const afternoonHour = screen.getByTestId('week-time-hour-13')
		const afternoonText = afternoonHour.textContent || ''
		expect(afternoonText).not.toMatch(/AM|PM/i)

		// 23:00 should show as "23" in 24-hour format
		const lateHour = screen.getByTestId('week-time-hour-23')
		const lateText = lateHour.textContent || ''
		expect(lateText).not.toMatch(/AM|PM/i)
	})

	test('displays time labels in 12-hour format when timeFormat is 12-hour', () => {
		cleanup()
		renderWeekView({ timeFormat: '12-hour' })

		// Check that times are displayed in 12-hour format
		// 00:00 should show as "12 AM" in 12-hour format (no minutes for on-the-hour)
		const midnightHour = screen.getByTestId('week-time-hour-00')
		const midnightText = midnightHour.textContent || ''
		// In 12-hour format, should contain AM or PM
		expect(midnightText).toMatch(/AM|PM/i)

		// 12:00 should show as "12 PM" in 12-hour format (noon)
		const noonHour = screen.getByTestId('week-time-hour-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).toMatch(/AM|PM/i)

		// 13:00 should show as "1 PM" in 12-hour format
		const afternoonHour = screen.getByTestId('week-time-hour-13')
		const afternoonText = afternoonHour.textContent || ''
		expect(afternoonText).toMatch(/AM|PM/i)

		// 23:00 should show as "11 PM" in 12-hour format
		const lateHour = screen.getByTestId('week-time-hour-23')
		const lateText = lateHour.textContent || ''
		expect(lateText).toMatch(/AM|PM/i)
	})

	test('defaults to 12-hour format when timeFormat is not provided', () => {
		cleanup()
		renderWeekView()

		// Should default to 12-hour format (timeFormat defaults to '12-hour')
		const midnightHour = screen.getByTestId('week-time-hour-00')
		const midnightText = midnightHour.textContent || ''
		expect(midnightText).toMatch(/AM|PM/i)

		const noonHour = screen.getByTestId('week-time-hour-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).toMatch(/AM|PM/i)
	})
})
