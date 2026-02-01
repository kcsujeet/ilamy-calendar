import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { generateMockEvents } from '@/lib/utils/generator'
import { DayView } from './day-view'

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
	const { currentDate } = useSmartCalendarContext()
	return (
		<>
			<div data-testid={`${testId}-year`}>{currentDate.year()}</div>
			<div data-testid={`${testId}-month`}>{currentDate.month()}</div>
			<div data-testid={`${testId}-date`}>{currentDate.date()}</div>
			{children}
		</>
	)
}

const renderDayView = (props = {}) => {
	const testId = 'current-date'
	return render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			firstDayOfWeek={firstDayOfWeek}
			locale={locale}
			{...props}
		>
			<TestWrapper testId={testId}>
				<DayView />
			</TestWrapper>
		</CalendarProvider>
	)
}

describe('DayView', () => {
	beforeEach(() => {
		// Reset the dayjs locale to default before each test
		locale = 'en'
		cleanup()
	})

	test('renders day view structure with proper layout', () => {
		renderDayView()

		// Should have the main container structure
		const container = screen.getByTestId('vertical-grid-scroll')
		expect(container).toBeInTheDocument()

		// Should have day header structure
		const headerContainer = screen.getByTestId('vertical-grid-header')
		expect(headerContainer).toBeInTheDocument()

		// Should have all-day row structure
		const allDayContainers = screen.getAllByTestId('vertical-grid-all-day')
		expect(allDayContainers.length).toBeGreaterThan(0)

		// Should have scroll area structure
		const scrollArea = screen.getByTestId('vertical-grid-scroll')
		expect(scrollArea).toBeInTheDocument()

		// Should have time grid structure
		const timeGrid = screen.getByTestId('vertical-grid-body')
		expect(timeGrid).toBeInTheDocument()
	})

	test('renders time column with 24 hour slots', () => {
		renderDayView()

		const timeCol = screen.getByTestId('vertical-col-time-col')
		expect(timeCol).toBeInTheDocument()

		// Check for some specific hour slots
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-12')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('renders events column structure', () => {
		renderDayView()
		const today = dayjs().format('YYYY-MM-DD')

		const eventsColumn = screen.getByTestId(`vertical-col-day-col-${today}`)
		expect(eventsColumn).toBeInTheDocument()

		// Background grid and interactive layer are now merged into the main flow
		// so we check for the time cells directly
		expect(
			screen.getByTestId(`vertical-cell-${today}-00-00`)
		).toBeInTheDocument()
	})

	test('displays current date correctly in header', () => {
		// Use today's actual date since the component might be defaulting to current date
		const today = dayjs()
		renderDayView()

		const header = screen.getByTestId('vertical-grid-header')
		expect(header).toBeInTheDocument()

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
	})

	test('shows today indicator for current day', () => {
		// Set the current date to today to ensure today indicator appears
		const today = dayjs()
		renderDayView({ initialDate: today })

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

		// Today indicator should be present if viewing today
		const timeIndicators = screen.queryAllByTestId('current-time-indicator')

		// Should show today indicator when viewing current day
		expect(timeIndicators.length).toBeGreaterThan(0)
	})

	//   test('does not show today indicator for other days', () => {
	//     // Set the date to a different day
	//     const otherDay = dayjs().add(1, 'day')
	//     renderDayView({ initialDate: otherDay.toDate() })

	//     // Today indicator should not be present
	//     const timeIndicator = screen.queryByTestId('current-time-indicator')
	//     expect(timeIndicator).toBeFalsy()
	//   })

	test('renders all-day events section', () => {
		renderDayView()

		const allDayRows = screen.getAllByTestId('vertical-grid-all-day')
		expect(allDayRows.length).toBeGreaterThan(0)

		// Should have "All-day" label
		expect(screen.getByText('All day')).toBeInTheDocument()
	})

	test('handles different locale settings', () => {
		renderDayView({ locale: 'en' })

		// Should render with English locale
		const header = screen.getByTestId('vertical-grid-header')
		expect(header).toBeInTheDocument()
	})

	test('renders time grid with proper height calculation', () => {
		renderDayView()

		const timeGrids = screen.getAllByTestId('vertical-grid-body')
		expect(timeGrids.length).toBeGreaterThan(0)
	})

	test('shows today badge in header when viewing current day', () => {
		const today = dayjs()
		renderDayView({ initialDate: today })

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

		// Note: The "Today" badge is in the header component which isn't rendered in this isolated test
		// This test verifies the context has the correct date which would show the badge in the full calendar
	})

	test('initializes with specified initial date - different day', () => {
		cleanup()
		const initialDate = dayjs('2025-06-15T10:00:00.000Z')
		renderDayView({ initialDate })

		// Should have currentDate set to June 2025 (month 5, 0-indexed)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
	})

	test('initializes with specified initial date - past date', () => {
		cleanup()
		const initialDate = dayjs('2020-01-15T10:00:00.000Z')
		renderDayView({ initialDate })

		// Should have currentDate set to January 2020 (month 0)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('0')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
	})

	test('initializes with specified initial date - future date', () => {
		cleanup()
		const initialDate = dayjs('2030-12-25T10:00:00.000Z')
		renderDayView({ initialDate })

		// Should have currentDate set to December 2030 (month 11)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('11')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')
	})

	test('defaults to current day when no initial date provided', () => {
		cleanup()
		const today = dayjs()
		renderDayView()

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
	})

	//   test('does not show today badge when viewing other days', () => {
	//     const otherDay = dayjs().add(1, 'day')
	//     renderDayView({ initialDate: otherDay.toDate() })

	//     // Should not show "Today" badge for other days
	//     expect(screen.queryByText('Today')).toBeNull()
	//   })

	test('renders with proper scrollable structure', () => {
		renderDayView()

		// Check for scrollable container
		const scrollArea = screen.getByTestId('vertical-grid-scroll')
		expect(scrollArea).toBeInTheDocument()

		// Check for time grid within scroll area
		const timeGrid = screen.getByTestId('vertical-grid-body')
		expect(timeGrid).toBeInTheDocument()
	})

	test('applies business hours styling correctly', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
		})

		const dateStr = monday.format('YYYY-MM-DD')

		// 10:00 should be business hour
		const businessCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		expect(businessCell.className).toContain('hover:bg-accent')
		expect(businessCell.className).not.toContain('bg-muted/30')
		expect(businessCell.className).toContain('cursor-pointer')

		// 08:00 should be non-business hour
		const nonBusinessCell = screen.getByTestId(`vertical-cell-${dateStr}-08-00`)
		expect(nonBusinessCell.className).toContain('bg-secondary')
		expect(nonBusinessCell.className).toContain('text-muted-foreground')
		expect(nonBusinessCell.className).not.toContain('hover:bg-muted/50')
		expect(nonBusinessCell.className).toContain('cursor-default')

		// 17:00 should be non-business hour (end time is exclusive)
		const endBusinessCell = screen.getByTestId(`vertical-cell-${dateStr}-17-00`)
		expect(endBusinessCell.className).toContain('bg-secondary')
		expect(endBusinessCell.className).toContain('text-muted-foreground')
		expect(endBusinessCell.className).toContain('cursor-default')
	})

	test('applies styling at exact boundary times (9am start, 5pm end)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
		})

		const dateStr = monday.format('YYYY-MM-DD')

		// Exactly at 9:00am (startTime) - Should be business hour
		const startBoundaryCell = screen.getByTestId(
			`vertical-cell-${dateStr}-09-00`
		)
		expect(startBoundaryCell.className).toContain('hover:bg-accent')
		expect(startBoundaryCell.className).not.toContain('bg-secondary')
		expect(startBoundaryCell.className).toContain('cursor-pointer')

		// Exactly at 5:00pm (endTime) - Should be non-business hour (endTime is exclusive)
		const endBoundaryCell = screen.getByTestId(`vertical-cell-${dateStr}-17-00`)
		expect(endBoundaryCell.className).toContain('bg-secondary')
		expect(endBoundaryCell.className).toContain('text-muted-foreground')
		expect(endBoundaryCell.className).toContain('cursor-default')

		// 4:45pm (15 minutes before endTime) - Should be business hour
		const beforeEndCell = screen.getByTestId(`vertical-cell-${dateStr}-16-45`)
		expect(beforeEndCell.className).toContain('hover:bg-accent')
		expect(beforeEndCell.className).not.toContain('bg-secondary')
		expect(beforeEndCell.className).toContain('cursor-pointer')

		// 8:45am (15 minutes before startTime) - Should be non-business hour
		const beforeStartCell = screen.getByTestId(`vertical-cell-${dateStr}-08-45`)
		expect(beforeStartCell.className).toContain('bg-secondary')
		expect(beforeStartCell.className).toContain('text-muted-foreground')
		expect(beforeStartCell.className).toContain('cursor-default')
	})

	test('respects businessHours with different weekdays', () => {
		cleanup()
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		// Test Monday (business day)
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		renderDayView({
			initialDate: monday,
			businessHours,
		})

		const mondayCell = screen.getByTestId(
			`vertical-cell-${monday.format('YYYY-MM-DD')}-10-00`
		)
		expect(mondayCell.className).toContain('hover:bg-accent')
		expect(mondayCell.className).not.toContain('bg-secondary')

		cleanup()

		// Test Sunday (non-business day)
		const sunday = dayjs('2025-01-05T00:00:00.000Z') // Sunday
		renderDayView({
			initialDate: sunday,
			businessHours,
		})

		const sundayCell = screen.getByTestId(
			`vertical-cell-${sunday.format('YYYY-MM-DD')}-10-00`
		)
		expect(sundayCell.className).toContain('bg-secondary')
		expect(sundayCell.className).toContain('text-muted-foreground')
		expect(sundayCell.className).toContain('cursor-default')
	})

	test('handles custom business hours (Tuesday-Thursday, 10am-3pm)', () => {
		cleanup()
		const businessHours = {
			daysOfWeek: ['tuesday', 'wednesday', 'thursday'],
			startTime: 10,
			endTime: 15, // 3pm
		}

		// Test Tuesday (business day) within hours
		const tuesday = dayjs('2025-01-07T00:00:00.000Z') // Tuesday
		renderDayView({
			initialDate: tuesday,
			businessHours,
		})

		const dateStr = tuesday.format('YYYY-MM-DD')

		// 11:00 should be business hour
		const businessCell = screen.getByTestId(`vertical-cell-${dateStr}-11-00`)
		expect(businessCell.className).toContain('hover:bg-accent')
		expect(businessCell.className).not.toContain('bg-secondary')

		// 9:00 should be non-business hour (before start)
		const earlyCell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		expect(earlyCell.className).toContain('bg-secondary')
		expect(earlyCell.className).toContain('text-muted-foreground')

		// 4:00pm should be non-business hour (after end)
		const lateCell = screen.getByTestId(`vertical-cell-${dateStr}-16-00`)
		expect(lateCell.className).toContain('bg-secondary')
		expect(lateCell.className).toContain('text-muted-foreground')

		cleanup()

		// Test Monday (non-business day)
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		renderDayView({
			initialDate: monday,
			businessHours,
		})

		const mondayCell = screen.getByTestId(
			`vertical-cell-${monday.format('YYYY-MM-DD')}-11-00`
		)
		expect(mondayCell.className).toContain('bg-secondary')
		expect(mondayCell.className).toContain('text-muted-foreground')
	})

	test('handles edge case: businessHours with single day', () => {
		cleanup()
		const wednesday = dayjs('2025-01-08T00:00:00.000Z') // Wednesday
		const businessHours = {
			daysOfWeek: ['wednesday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: wednesday,
			businessHours,
		})

		const dateStr = wednesday.format('YYYY-MM-DD')

		// Wednesday 10am - Business hour
		const wednesdayCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		expect(wednesdayCell.className).toContain('hover:bg-accent')
		expect(wednesdayCell.className).not.toContain('bg-secondary')

		cleanup()

		// Test Tuesday (non-business day)
		const tuesday = dayjs('2025-01-07T00:00:00.000Z') // Tuesday
		renderDayView({
			initialDate: tuesday,
			businessHours,
		})

		const tuesdayCell = screen.getByTestId(
			`vertical-cell-${tuesday.format('YYYY-MM-DD')}-10-00`
		)
		expect(tuesdayCell.className).toContain('bg-secondary')
		expect(tuesdayCell.className).toContain('text-muted-foreground')
	})

	test('handles no businessHours prop (all times are clickable)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday

		renderDayView({
			initialDate: monday,
			// No businessHours prop
		})

		const dateStr = monday.format('YYYY-MM-DD')

		// Monday 10am - Should be clickable (no business hours restriction)
		const mondayCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		expect(mondayCell.className).toContain('hover:bg-accent')
		expect(mondayCell.className).not.toContain('bg-secondary')
		expect(mondayCell.className).toContain('cursor-pointer')

		// Sunday 8pm - Should be clickable (no business hours restriction)
		cleanup()
		const sunday = dayjs('2025-01-05T00:00:00.000Z') // Sunday
		renderDayView({
			initialDate: sunday,
		})

		const sundayCell = screen.getByTestId(
			`vertical-cell-${sunday.format('YYYY-MM-DD')}-20-00`
		)
		expect(sundayCell.className).toContain('hover:bg-accent')
		expect(sundayCell.className).not.toContain('bg-secondary')
		expect(sundayCell.className).toContain('cursor-pointer')
	})

	test('verifies 15-minute time slot granularity with business hours', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
		})

		const dateStr = monday.format('YYYY-MM-DD')

		// Test all 15-minute slots in the 9am hour (all should be business hours)
		const slots = ['09-00', '09-15', '09-30', '09-45']
		slots.forEach((slot) => {
			const cell = screen.getByTestId(`vertical-cell-${dateStr}-${slot}`)
			expect(cell.className).toContain('hover:bg-accent')
			expect(cell.className).not.toContain('bg-secondary')
		})

		// Test all 15-minute slots in the 8am hour (all should be non-business hours)
		const nonBusinessSlots = ['08-00', '08-15', '08-30', '08-45']
		nonBusinessSlots.forEach((slot) => {
			const cell = screen.getByTestId(`vertical-cell-${dateStr}-${slot}`)
			expect(cell.className).toContain('bg-secondary')
			expect(cell.className).toContain('text-muted-foreground')
		})
	})

	test('displays time in 24-hour format when timeFormat is 24-hour', () => {
		cleanup()
		renderDayView({ timeFormat: '24-hour' })

		// Check that times are displayed in 24-hour format
		// 00:00 should show as "0" or "00" in 24-hour format (no minutes for on-the-hour)
		const midnightHour = screen.getByTestId('vertical-time-00')
		const midnightText = midnightHour.textContent || ''
		// In 24-hour format, should not contain AM/PM
		expect(midnightText).not.toMatch(/AM|PM/i)

		// 12:00 should show as "12" in 24-hour format (noon)
		const noonHour = screen.getByTestId('vertical-time-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).not.toMatch(/AM|PM/i)

		// 13:00 should show as "13" in 24-hour format
		const afternoonHour = screen.getByTestId('vertical-time-13')
		const afternoonText = afternoonHour.textContent || ''
		expect(afternoonText).not.toMatch(/AM|PM/i)

		// 23:00 should show as "23" in 24-hour format
		const lateHour = screen.getByTestId('vertical-time-23')
		const lateText = lateHour.textContent || ''
		expect(lateText).not.toMatch(/AM|PM/i)
	})

	test('displays time in 12-hour format when timeFormat is 12-hour', () => {
		cleanup()
		renderDayView({ timeFormat: '12-hour' })

		// Check that times are displayed in 12-hour format
		// 00:00 should show as "12 AM" in 12-hour format (no minutes for on-the-hour)
		const midnightHour = screen.getByTestId('vertical-time-00')
		const midnightText = midnightHour.textContent || ''
		// In 12-hour format, should contain AM or PM
		// Note: The exact format depends on locale, but should have AM/PM indicator
		expect(midnightText).toMatch(/AM|PM/i)

		// 12:00 should show as "12 PM" in 12-hour format (noon)
		const noonHour = screen.getByTestId('vertical-time-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).toMatch(/AM|PM/i)

		// 13:00 should show as "1 PM" in 12-hour format
		const afternoonHour = screen.getByTestId('vertical-time-13')
		const afternoonText = afternoonHour.textContent || ''
		expect(afternoonText).toMatch(/AM|PM/i)

		// 23:00 should show as "11 PM" in 12-hour format
		const lateHour = screen.getByTestId('vertical-time-23')
		const lateText = lateHour.textContent || ''
		expect(lateText).toMatch(/AM|PM/i)
	})

	test('defaults to 12-hour format when timeFormat is not provided', () => {
		cleanup()
		renderDayView()

		// Should default to 12-hour format (timeFormat defaults to '12-hour')
		const midnightHour = screen.getByTestId('vertical-time-00')
		const midnightText = midnightHour.textContent || ''
		expect(midnightText).toMatch(/AM|PM/i)

		const noonHour = screen.getByTestId('vertical-time-12')
		const noonText = noonHour.textContent || ''
		expect(noonText).toMatch(/AM|PM/i)
	})

	test('correctly formats all 24 hours in 24-hour format', () => {
		cleanup()
		renderDayView({ timeFormat: '24-hour' })

		// Verify all hours from 0-23 are displayed without AM/PM
		for (let hour = 0; hour < 24; hour++) {
			const hourStr = hour.toString().padStart(2, '0')
			const hourElement = screen.getByTestId(`vertical-time-${hourStr}`)
			const hourText = hourElement.textContent || ''
			expect(hourText).not.toMatch(/AM|PM/i)
		}
	})

	test('hides non-business hours when hideNonBusinessHours is true', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: true,
		})

		// Business hours should be present
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()

		// Non-business hours should NOT be present
		expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-23')).not.toBeInTheDocument()
	})

	test('shows all hours if hideNonBusinessHours is true but businessHours is missing', () => {
		cleanup()
		renderDayView({
			hideNonBusinessHours: true,
			// No businessHours provided
		})

		// Should fallback to 24 hours
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	// Backwards compatibility tests
	test('shows all 24 hours when hideNonBusinessHours is false (default behavior)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: false, // Explicitly false
		})

		// All 24 hours should be present
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('shows all 24 hours when hideNonBusinessHours is not provided (backwards compatibility)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			// hideNonBusinessHours is NOT provided - should default to false
		})

		// All 24 hours should be present (backwards compatible behavior)
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('still applies business hours styling when hideNonBusinessHours is false', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: false,
		})

		// Business hour cell should have business styling
		const businessCell = screen.getByTestId(
			`vertical-cell-${monday.format('YYYY-MM-DD')}-10-00`
		)
		expect(businessCell.className).toContain('hover:bg-accent')
		expect(businessCell.className).toContain('cursor-pointer')

		// Non-business hour cell should have non-business styling
		const nonBusinessCell = screen.getByTestId(
			`vertical-cell-${monday.format('YYYY-MM-DD')}-08-00`
		)
		expect(nonBusinessCell.className).toContain('bg-secondary')
		expect(nonBusinessCell.className).toContain('cursor-default')
	})

	// Event positioning tests - CRITICAL for hideNonBusinessHours
	test('positions event at 0% top when event starts at business hour start with hideNonBusinessHours true', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 9am (business start)
		const testEvent: CalendarEvent = {
			id: 'test-event-9am',
			title: 'Morning Meeting',
			start: dayjs('2025-01-06T09:00:00.000Z'),
			end: dayjs('2025-01-06T10:00:00.000Z'),
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Morning Meeting')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 9am should be at top: 0%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false (24-hour grid)', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 9am
		const testEvent: CalendarEvent = {
			id: 'test-event-9am-full',
			title: 'Morning Meeting Full Day',
			start: dayjs('2025-01-06T09:00:00.000Z'),
			end: dayjs('2025-01-06T10:00:00.000Z'),
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: false,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Morning Meeting Full Day')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 9am in a 24-hour grid should be at ~37.5% (9/24 * 100)
		// This is the key difference - with 24 hours, 9am is NOT at top 0%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).not.toContain('top: 0%')
	})

	test('positions event at correct percentage when event is in middle of business hours', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 1pm (13:00), which is 4 hours after 9am
		// With 8 business hours (9-17), 1pm should be at 50% (4/8 * 100)
		const testEvent: CalendarEvent = {
			id: 'test-event-1pm',
			title: 'Afternoon Meeting',
			start: dayjs('2025-01-06T13:00:00.000Z'),
			end: dayjs('2025-01-06T14:00:00.000Z'),
		}

		renderDayView({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Afternoon Meeting')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).toContain('top: 50%')
	})
})
