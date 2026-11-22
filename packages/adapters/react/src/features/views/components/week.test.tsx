import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import {
	add,
	dayKey,
	getFields,
	now,
	parseDate,
	startOf,
	subtract,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen, within } from '@testing-library/react'
import type React from 'react'
import { CalendarProvider } from '@/app/calendar-provider'
import { DISABLED_CELL_CLASSNAME } from '@/config/constants'
import { STICKY_GUTTER_SHADOW } from '@/features/views/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { generateMockEvents } from '@/testing/generator'
import { WeekView } from '@/testing/view-harnesses'

const weekDays: string[] = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
]

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const mockEvents: CalendarEvent[] = generateMockEvents()
const firstDayOfWeek = 0
const dayMaxEvents = 3
let locale = 'en'
const initialZoned = now('UTC')
const initialDate = toOffsetIso(initialZoned)

const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId: string
}) => {
	const { currentDate } = useSmartCalendarContext()
	const parsed = parseDate(currentDate, 'UTC')
	return (
		<>
			<div data-testid={`${testId}-year`}>{parsed?.year}</div>
			<div data-testid={`${testId}-month`}>{parsed?.month}</div>
			<div data-testid={`${testId}-date`}>{parsed?.day}</div>
			{children}
		</>
	)
}

const renderWeekView = (props = {}) => {
	const testId = 'current-date'
	return render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			firstDayOfWeek={firstDayOfWeek}
			initialDate={initialDate}
			initialView="week"
			locale={locale}
			timezone="UTC"
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
		cleanup()
		locale = 'en'
		renderWeekView()
	})

	test('renders week view structure with proper layout', () => {
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-header')).toBeInTheDocument()
		expect(
			screen.getAllByTestId('vertical-grid-all-day').length
		).toBeGreaterThan(0)
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
	})

	test('renders WeekView with correct weekday headers starting from Sunday', () => {
		for (const day of weekDays) {
			expect(
				screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		}
	})

	test('animates the day label only, leaving the header cell static', () => {
		cleanup()
		renderWeekView()

		const cell = screen.getByTestId('week-header-weekday-sunday')
		const animated = cell.querySelector('.animate-in')

		expect(cell.className).not.toContain('animate-in')
		expect(animated).not.toBeNull()
		expect((animated as HTMLElement).style.animationDelay).toBe('0s')
	})

	test('renders WeekView with correct weekday headers starting from Monday', () => {
		cleanup()
		renderWeekView({ firstDayOfWeek: 1 })

		for (const day of weekDays) {
			expect(
				screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		}
	})

	test('displays current week dates correctly', () => {
		const currentWeek = startOf(initialZoned, 'week', 0)
		const weekStart = currentWeek.day
		const weekEnd = add(currentWeek, 6, 'day').day

		expect(screen.getAllByText(String(weekStart)).length).toBeGreaterThan(0)
		expect(screen.getAllByText(String(weekEnd)).length).toBeGreaterThan(0)
	})

	test('handles events display in week structure', () => {
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
		expect(
			screen.getAllByTestId('vertical-grid-all-day').length
		).toBeGreaterThan(0)
	})

	test('renders with proper scrollable time grid', () => {
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
	})

	test('respects firstDayOfWeek prop', () => {
		cleanup()
		renderWeekView({ firstDayOfWeek: 1 })

		expect(screen.getByTestId('week-header-weekday-monday')).toBeInTheDocument()
		expect(screen.getByTestId('week-header-weekday-sunday')).toBeInTheDocument()
	})

	test('handles different locale settings', () => {
		cleanup()
		renderWeekView({ locale: 'en' })

		expect(screen.getByTestId('week-header-weekday-sunday')).toBeInTheDocument()
		expect(screen.getByTestId('week-header-weekday-monday')).toBeInTheDocument()
	})

	test('keeps English weekday test ids in another locale', () => {
		cleanup()
		renderWeekView({ locale: 'de' })

		expect(
			screen.getByTestId('week-header-weekday-wednesday')
		).toBeInTheDocument()
	})

	test('renders time slots structure', () => {
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-12')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('renders day columns for the week', () => {
		cleanup()
		renderWeekView()
		const startOfWeek = startOf(initialZoned, 'week', 0)

		for (let i = 0; i < 7; i++) {
			const dayDate = add(startOfWeek, i, 'day')
			expect(
				screen.getByTestId(`vertical-col-day-col-${dayKey(dayDate)}`)
			).toBeInTheDocument()
		}
	})

	test('renders time cells for each day', () => {
		const firstDay = dayKey(startOf(initialZoned, 'week', 0))
		const testIdPrefix = `vertical-cell-${firstDay}`

		expect(screen.getByTestId(`${testIdPrefix}-00-00`)).toBeInTheDocument()
		expect(screen.getByTestId(`${testIdPrefix}-12-00`)).toBeInTheDocument()
		expect(screen.getByTestId(`${testIdPrefix}-23-00`)).toBeInTheDocument()
	})

	test('renders only hour slots by default (no sub-hour subdivisions)', () => {
		const firstDay = dayKey(startOf(initialZoned, 'week', 0))

		expect(
			screen.getByTestId(`vertical-cell-${firstDay}-09-00`)
		).toBeInTheDocument()
		expect(
			screen.queryByTestId(`vertical-cell-${firstDay}-09-15`)
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId(`vertical-cell-${firstDay}-09-30`)
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId(`vertical-cell-${firstDay}-09-45`)
		).not.toBeInTheDocument()
	})

	test('renders quarter-hour slots when slotDuration is 15', () => {
		cleanup()
		renderWeekView({ slotDuration: 15 })

		const firstDay = dayKey(startOf(initialZoned, 'week', 0))
		for (const mm of ['00', '15', '30', '45']) {
			expect(
				screen.getByTestId(`vertical-cell-${firstDay}-09-${mm}`)
			).toBeInTheDocument()
		}
	})

	test('renders event layers for each day', () => {
		const startOfWeek = startOf(initialZoned, 'week', 0)

		for (let i = 0; i < 7; i++) {
			const dayDate = add(startOfWeek, i, 'day')
			expect(
				screen.getByTestId(`vertical-events-day-col-${dayKey(dayDate)}`)
			).toBeInTheDocument()
		}
	})

	test('initializes with specified initial date - different week', () => {
		cleanup()
		renderWeekView({ initialDate: '2025-06-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('6')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
		expect(
			screen.getByTestId('vertical-events-day-col-2025-06-15')
		).toBeInTheDocument()
	})

	test('initializes with specified initial date - past date', () => {
		cleanup()
		renderWeekView({ initialDate: '2020-01-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('1')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
		expect(
			screen.getByTestId('vertical-events-day-col-2020-01-15')
		).toBeInTheDocument()
	})

	test('initializes with specified initial date - future date', () => {
		cleanup()
		renderWeekView({ initialDate: '2030-12-25T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('12')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')
		expect(
			screen.getByTestId('vertical-events-day-col-2030-12-25')
		).toBeInTheDocument()
	})

	test('defaults to current week when no initial date provided', () => {
		cleanup()
		renderWeekView()

		expect(screen.getByTestId('current-date-year')).toHaveTextContent(
			String(initialZoned.year)
		)
		expect(screen.getByTestId('current-date-month')).toHaveTextContent(
			String(initialZoned.month)
		)
		expect(screen.getByTestId('current-date-date')).toHaveTextContent(
			String(initialZoned.day)
		)
		expect(
			screen.getByTestId(`vertical-events-day-col-${dayKey(initialZoned)}`)
		).toBeInTheDocument()
	})

	test('all-day event ending on Sunday should not appear on Monday when firstDayOfWeek is Monday', () => {
		cleanup()
		const allDayEvent: CalendarEvent = {
			id: 'all-day-event-nov-17-23',
			title: 'Week-long Event',
			start: '2025-11-17T00:00:00+00:00',
			end: '2025-11-24T00:00:00+00:00',
			allDay: true,
			color: 'blue',
		}

		renderWeekView({
			firstDayOfWeek: 1,
			initialDate: '2025-11-24T00:00:00Z',
			events: [allDayEvent],
		})

		expect(
			screen.getAllByTestId('vertical-grid-all-day').length
		).toBeGreaterThan(0)
		expect(screen.queryByText('Week-long Event')).not.toBeInTheDocument()
	})

	test('all-day event spanning the exact week should render correctly when firstDayOfWeek is Monday', () => {
		cleanup()
		const allDayEvent: CalendarEvent = {
			id: 'all-day-event-full-week',
			title: 'Full Week Event',
			start: '2025-11-17T00:00:00+00:00',
			end: '2025-11-24T00:00:00+00:00',
			allDay: true,
			color: 'green',
		}

		renderWeekView({
			firstDayOfWeek: 1,
			initialDate: '2025-11-20T00:00:00Z',
			events: [allDayEvent],
		})

		expect(screen.getByText('Full Week Event')).toBeInTheDocument()
	})

	test('applies business hours shading without disabling cells (4.0.5)', () => {
		cleanup()
		const businessHours = { daysOfWeek: ['monday'], startTime: 9, endTime: 17 }

		renderWeekView({ initialDate: '2025-01-06T00:00:00Z', businessHours })

		const businessCell = screen.getByTestId('vertical-cell-2025-01-06-10-00')
		expect(businessCell.getAttribute('data-non-business')).toBeNull()
		expect(businessCell.getAttribute('data-disabled')).toBe('false')
		expect(businessCell.className).toContain('cursor-pointer')

		const nonBusinessCell = screen.getByTestId('vertical-cell-2025-01-06-08-00')
		expect(nonBusinessCell.getAttribute('data-non-business')).toBe('true')
		expect(nonBusinessCell.getAttribute('data-disabled')).toBe('false')
		expect(nonBusinessCell.className).toContain('text-muted-foreground')
		expect(nonBusinessCell.className).toContain('cursor-pointer')

		const sundayCell = screen.getByTestId('vertical-cell-2025-01-05-10-00')
		expect(sundayCell.getAttribute('data-non-business')).toBe('true')
		expect(sundayCell.getAttribute('data-disabled')).toBe('false')
	})

	test('applies shading at exact boundary times (9am start, 5pm end)', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
		})

		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-09-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-17-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-16-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-08-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('respects businessHours with firstDayOfWeek=Monday', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			firstDayOfWeek: 1,
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
		})

		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-10-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-10-10-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-11-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-12-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('respects businessHours with firstDayOfWeek=Sunday', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-05T00:00:00Z',
			firstDayOfWeek: 0,
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
		})

		expect(
			screen
				.getByTestId('vertical-cell-2025-01-05-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-10-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-11-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles custom business hours (Tuesday-Thursday, 10am-3pm)', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-07T00:00:00Z',
			businessHours: {
				daysOfWeek: ['tuesday', 'wednesday', 'thursday'],
				startTime: 10,
				endTime: 15,
			},
		})

		expect(
			screen
				.getByTestId('vertical-cell-2025-01-07-11-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-07-09-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-07-16-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-11-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-10-11-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles edge case: businessHours with single day', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-08T00:00:00Z',
			businessHours: { daysOfWeek: ['wednesday'], startTime: 9, endTime: 17 },
		})

		expect(
			screen
				.getByTestId('vertical-cell-2025-01-08-10-00')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-07-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-09-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles no businessHours prop (all times are unshaded and clickable)', () => {
		cleanup()
		renderWeekView({ initialDate: '2025-01-06T00:00:00Z' })

		const mondayCell = screen.getByTestId('vertical-cell-2025-01-06-10-00')
		expect(mondayCell.getAttribute('data-non-business')).toBeNull()
		expect(mondayCell.className).toContain('cursor-pointer')

		const sundayCell = screen.getByTestId('vertical-cell-2025-01-05-10-00')
		expect(sundayCell.getAttribute('data-non-business')).toBeNull()
		expect(sundayCell.className).toContain('cursor-pointer')
	})

	test('displays time labels in 24-hour format when timeFormat is 24-hour', () => {
		cleanup()
		renderWeekView({ timeFormat: '24-hour' })

		for (const hh of ['00', '12', '13', '23']) {
			expect(
				screen.getByTestId(`vertical-time-${hh}`).textContent || ''
			).not.toMatch(/AM|PM/i)
		}
	})

	test('displays time labels in 12-hour format when timeFormat is 12-hour', () => {
		cleanup()
		renderWeekView({ timeFormat: '12-hour' })

		for (const hh of ['00', '12', '13', '23']) {
			expect(
				screen.getByTestId(`vertical-time-${hh}`).textContent || ''
			).toMatch(/AM|PM/i)
		}
	})

	test('defaults to 12-hour format when timeFormat is not provided', () => {
		cleanup()
		renderWeekView()

		expect(screen.getByTestId('vertical-time-00').textContent || '').toMatch(
			/AM|PM/i
		)
		expect(screen.getByTestId('vertical-time-12').textContent || '').toMatch(
			/AM|PM/i
		)
	})

	test('hides non-business hours based on weekly range in WeekView', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: [
				{ daysOfWeek: ['monday'], startTime: 8, endTime: 12 },
				{ daysOfWeek: ['tuesday'], startTime: 14, endTime: 18 },
			],
			hideNonBusinessHours: true,
		})

		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-07')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-18')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-23')).not.toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-12')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-13')).toBeInTheDocument()
	})

	test('does not crash when hideNonBusinessHours produces an empty hour range', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 9,
			},
			hideNonBusinessHours: true,
		})

		expect(screen.getByTestId('vertical-grid-all-day')).toBeInTheDocument()
		expect(screen.queryByTestId('vertical-grid-body')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-00')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-12')).not.toBeInTheDocument()
	})

	test('shows all 24 hours when hideNonBusinessHours is false or omitted', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: false,
		})

		for (const hh of ['00', '08', '09', '16', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}
	})

	test('scroll area uses flex column container for scroll containment', () => {
		cleanup()
		renderWeekView()

		const container = screen.getByTestId('vertical-grid-container')
		expect(container.className).toContain('flex')
		expect(container.className).toContain('flex-col')
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
	})

	test('Ensure first column has the same width as the time gutter', () => {
		cleanup()
		renderWeekView()
		const weekViewHeader = screen.getByTestId('week-view-header')
		const timeGutter = screen.getByTestId('vertical-col-time-col')
		const allDayRow = screen.getByTestId('all-day-row')
		const firstCellOfAllDayRow = allDayRow.querySelector('div')
		const firstCellOfWeekViewHeader = weekViewHeader.querySelector('div')
		const classNamesToCheck = ['w-10', 'sm:w-16', 'min-w-10', 'sm:min-w-16']
		for (const className of classNamesToCheck) {
			expect(timeGutter.className).toContain(className)
			expect(firstCellOfAllDayRow?.className).toContain(className)
			expect(firstCellOfWeekViewHeader?.className).toContain(className)
		}
	})

	test('Ensure gutter provides exactly one right separator via box-shadow', () => {
		const weekViewHeader = screen.getByTestId('week-view-header')
		const timeGutter = screen.getByTestId('vertical-col-time-col')
		const allDayRow = screen.getByTestId('all-day-row')
		const firstCellOfAllDayRow = allDayRow.querySelector('div')
		const firstCellOfWeekViewHeader = weekViewHeader.querySelector('div')

		expect(timeGutter.className).toContain(STICKY_GUTTER_SHADOW)
		expect(timeGutter.className).not.toContain('border-r')
		expect(screen.getByTestId('vertical-time-00').className).not.toContain(
			'border-r'
		)
		expect(firstCellOfAllDayRow?.className).toContain(STICKY_GUTTER_SHADOW)
		expect(firstCellOfAllDayRow?.className).not.toContain('border-r')
		expect(firstCellOfWeekViewHeader?.className).toContain(STICKY_GUTTER_SHADOW)
		expect(firstCellOfWeekViewHeader?.className).not.toContain('border-r')
	})

	test('Ensure day columns carry no per-cell right border', () => {
		const startOfWeek = startOf(initialZoned, 'week', 0)
		const lastDay = dayKey(add(startOfWeek, 6, 'day'))

		const cellOfWeekViewHeader = screen
			.getByTestId('week-view-header')
			.querySelector('div + div')
		expect(cellOfWeekViewHeader?.className).not.toContain('border-r')
		expect(screen.getByTestId(`day-cell-${lastDay}`).className).not.toContain(
			'border-r'
		)
		expect(
			screen.getByTestId(`vertical-col-day-col-${lastDay}`).className
		).not.toContain('border-r')
	})

	test('Ensure column have the same width', () => {
		const firstDay = dayKey(startOf(initialZoned, 'week', 0))
		const lastCellOfAllDayRow = screen.getByTestId(`day-cell-${firstDay}`)
		const classNamesToControlWidth = ['flex-1', 'min-w-0']
		const firstDayColumn = screen.getByTestId(
			`vertical-col-day-col-${firstDay}`
		)
		const firstDayHeader = screen.getByTestId('week-header-weekday-sunday')
		for (const className of classNamesToControlWidth) {
			expect(firstDayHeader.className).toContain(className)
			expect(lastCellOfAllDayRow.className).toContain(className)
			expect(firstDayColumn.className).toContain(className)
		}
	})

	test('positions event at 0% top when event starts at business hour start with hideNonBusinessHours true', () => {
		cleanup()
		const testEvent: CalendarEvent = {
			id: 'test-event-9am-week',
			title: 'Week Morning Meeting',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
		}

		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Week Morning Meeting')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false in WeekView', () => {
		cleanup()
		const testEvent: CalendarEvent = {
			id: 'test-event-9am-week-full',
			title: 'Week Morning Full',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
		}

		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: false,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Week Morning Full')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').not.toContain('top: 0%')
	})

	test('hiddenDays hides specified day columns (hide saturday/sunday shows 5 columns)', () => {
		cleanup()
		const monday = atUtc('2025-01-06T00:00:00Z')
		const hiddenDays = new Set([0, 6])

		renderWeekView({
			initialDate: toOffsetIso(monday),
			firstDayOfWeek: 0,
			hiddenDays,
		})

		const startOfWeek = startOf(monday, 'week', 0)
		for (let i = 0; i < 7; i++) {
			const dayDate = add(startOfWeek, i, 'day')
			const dayColTestId = `vertical-col-day-col-${dayKey(dayDate)}`
			const dow = getFields(dayDate).dayOfWeek

			if (dow === 0 || dow === 6) {
				expect(screen.queryByTestId(dayColTestId)).not.toBeInTheDocument()
			} else {
				expect(screen.getByTestId(dayColTestId)).toBeInTheDocument()
			}
		}
	})

	test('hiddenDays filters day header cells', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			firstDayOfWeek: 0,
			hiddenDays: new Set([0, 6]),
		})

		expect(
			screen.queryByTestId('week-header-weekday-saturday')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('week-header-weekday-sunday')
		).not.toBeInTheDocument()
		expect(screen.getByTestId('week-header-weekday-monday')).toBeInTheDocument()
		expect(screen.getByTestId('week-header-weekday-friday')).toBeInTheDocument()
	})

	test('empty hiddenDays shows all 7 days (default behavior)', () => {
		cleanup()
		const monday = atUtc('2025-01-06T00:00:00Z')
		renderWeekView({ initialDate: toOffsetIso(monday) })

		for (const day of weekDays) {
			expect(
				screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		}

		const startOfWeek = startOf(monday, 'week', 0)
		for (let i = 0; i < 7; i++) {
			const dayDate = add(startOfWeek, i, 'day')
			expect(
				screen.getByTestId(`vertical-col-day-col-${dayKey(dayDate)}`)
			).toBeInTheDocument()
		}
	})

	test('updates day columns when hiddenDays changes after initial render', () => {
		cleanup()
		const monday = atUtc('2025-01-06T00:00:00Z')
		const ui = (hiddenDays?: Set<number>) => (
			<CalendarProvider
				dayMaxEvents={dayMaxEvents}
				events={[]}
				firstDayOfWeek={0}
				hiddenDays={hiddenDays}
				initialDate={toOffsetIso(monday)}
				initialView="week"
				locale="en"
				timezone="UTC"
			>
				<WeekView />
			</CalendarProvider>
		)
		const { rerender } = render(ui(undefined))

		const sunday = dayKey(startOf(monday, 'week', 0))
		const saturday = dayKey(add(startOf(monday, 'week', 0), 6, 'day'))
		expect(
			screen.getByTestId(`vertical-col-day-col-${sunday}`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-col-day-col-${saturday}`)
		).toBeInTheDocument()

		rerender(ui(new Set([0, 6])))

		expect(
			screen.queryByTestId(`vertical-col-day-col-${sunday}`)
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId(`vertical-col-day-col-${saturday}`)
		).not.toBeInTheDocument()
	})

	test('keeps responsive all-day spacer/cell classes when hiddenDays leaves one visible day', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			firstDayOfWeek: 0,
			hiddenDays: new Set([0, 2, 3, 4, 5, 6]),
		})

		const allDayRow = screen.getByTestId('all-day-row')
		const spacer = allDayRow.querySelector('div')
		for (const className of ['w-10', 'sm:w-16', 'min-w-10', 'sm:min-w-16']) {
			expect(spacer?.className).toContain(className)
		}

		const mondayCell = screen.getByTestId('day-cell-2025-01-06')
		for (const className of ['flex-1', 'min-w-0']) {
			expect(mondayCell.className).toContain(className)
		}
	})

	test('hiddenDays with single hidden day works correctly', () => {
		cleanup()
		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			firstDayOfWeek: 0,
			hiddenDays: new Set([3]),
		})

		expect(
			screen.queryByTestId('week-header-weekday-wednesday')
		).not.toBeInTheDocument()
		for (const day of [
			'monday',
			'tuesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		]) {
			expect(
				screen.getByTestId(`week-header-weekday-${day}`)
			).toBeInTheDocument()
		}
	})

	test('positions event at correct percentage when event is in middle of business hours in WeekView', () => {
		cleanup()
		const testEvent: CalendarEvent = {
			id: 'test-event-1pm-week',
			title: 'Week Afternoon Meeting',
			start: '2025-01-06T13:00:00+00:00',
			end: '2025-01-06T14:00:00+00:00',
		}

		renderWeekView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Week Afternoon Meeting')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 50%')
	})

	test('customizes hour rendering when renderHour prop is provided', () => {
		cleanup()
		const renderHour = (iso: string) => {
			const d = parseDate(iso, 'UTC')
			const hh = String(d?.hour ?? 0).padStart(2, '0')
			const mm = String(d?.minute ?? 0).padStart(2, '0')
			return <span data-testid={`custom-hour-${hh}`}>{`${hh}:${mm}`}</span>
		}

		renderWeekView({ renderHour })

		expect(screen.getByTestId('custom-hour-00')).toHaveTextContent('00:00')
		expect(screen.getByTestId('custom-hour-12')).toHaveTextContent('12:00')
		expect(screen.getByTestId('custom-hour-23')).toHaveTextContent('23:00')
	})

	describe('the current hour', () => {
		const renderHour = (iso: string) => {
			const d = parseDate(iso, 'UTC')
			const hh = String(d?.hour ?? 0).padStart(2, '0')
			return <span data-testid={`hour-${hh}`}>{hh}</span>
		}
		const markedHours = () =>
			[...document.querySelectorAll('[aria-current="time"]')].map(
				(label) => label.textContent
			)

		test('the gutter marks the hour holding now in a week that shows today', () => {
			cleanup()
			renderWeekView({ renderHour })

			expect(markedHours()).toEqual([String(now('UTC').hour).padStart(2, '0')])
		})

		test('a week that does not show today marks no hour', () => {
			cleanup()
			renderWeekView({
				renderHour,
				initialDate: toOffsetIso(add(now('UTC'), 1, 'week')),
			})

			expect(markedHours()).toEqual([])
		})
	})

	describe('scrollTime', () => {
		const originalScrollTo = Element.prototype.scrollTo

		afterEach(() => {
			Element.prototype.scrollTo = originalScrollTo
		})

		test('scrolls the viewport when scrollTime is set', () => {
			cleanup()
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderWeekView({ scrollTime: '09:00:00' })

			expect(scrollSpy).toHaveBeenCalled()
		})

		test('does not scroll when scrollTime is not provided', () => {
			cleanup()
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderWeekView()

			expect(scrollSpy).not.toHaveBeenCalled()
		})
	})

	describe('weeks spanning two months', () => {
		const monday = '2025-03-31T00:00:00Z'
		const tuesday = '2025-04-01T00:00:00Z'

		const cellAt = (date: string) =>
			screen.getByTestId(`vertical-cell-${date}-10-00`)

		const renderCrossMonthWeek = (dateIso: string) => {
			cleanup()
			renderWeekView({
				initialDate: dateIso,
				firstDayOfWeek: 1,
				timezone: 'UTC',
			})
		}

		test("keeps next month's days interactive when navigated in from March", () => {
			renderCrossMonthWeek(monday)

			expect(cellAt('2025-04-01').dataset.disabled).toBe('false')
			expect(cellAt('2025-04-01').className).not.toContain(
				DISABLED_CELL_CLASSNAME
			)
			expect(cellAt('2025-04-01').className).toContain('cursor-pointer')
		})

		test("keeps next month's all-day cells interactive", () => {
			renderCrossMonthWeek(monday)
			const allDayCell = screen.getByTestId('day-cell-2025-04-01')

			expect(allDayCell.dataset.disabled).toBe('false')
		})

		test("keeps last month's days interactive when navigated in from April", () => {
			renderCrossMonthWeek(tuesday)

			expect(cellAt('2025-03-31').dataset.disabled).toBe('false')
			expect(cellAt('2025-03-31').className).not.toContain(
				DISABLED_CELL_CLASSNAME
			)
			expect(cellAt('2025-03-31').className).toContain('cursor-pointer')
		})

		test("still shades next month's days outside business hours (4.0.5)", () => {
			cleanup()
			renderWeekView({
				initialDate: monday,
				firstDayOfWeek: 1,
				timezone: 'UTC',
				businessHours: {
					daysOfWeek: ['monday', 'tuesday'],
					startTime: 9,
					endTime: 17,
				},
			})
			const outsideHours = screen.getByTestId('vertical-cell-2025-04-01-03-00')

			expect(cellAt('2025-04-01').dataset.nonBusiness).toBeUndefined()
			expect(outsideHours.dataset.nonBusiness).toBe('true')
			expect(outsideHours.dataset.disabled).toBe('false')
		})
	})

	describe('display toggles', () => {
		const newYearsDay2023 = '2023-01-01T12:00:00Z'

		test('allDaySlot is on by default', () => {
			cleanup()
			renderWeekView()
			expect(screen.getByTestId('all-day-row')).toBeInTheDocument()
		})

		test('allDaySlot={false} removes the all-day row', () => {
			cleanup()
			renderWeekView({ allDaySlot: false })

			expect(screen.queryByTestId('all-day-row')).not.toBeInTheDocument()
			expect(screen.queryByTestId('vertical-grid-all-day')).toBeNull()
		})

		test('shows the locale week number in the header corner when weekNumbers is unset', () => {
			cleanup()
			renderWeekView({ initialDate: newYearsDay2023 })

			expect(screen.getByTestId('week-number')).toHaveTextContent('1')
		})

		test('weekNumbers={false} hides the week number and its label', () => {
			cleanup()
			renderWeekView({ initialDate: newYearsDay2023, weekNumbers: false })

			expect(screen.queryByTestId('week-number')).not.toBeInTheDocument()
			expect(
				within(screen.getByTestId('week-view-header')).queryByText('Week')
			).not.toBeInTheDocument()
		})

		test('weekNumbers={true} shows the week number', () => {
			cleanup()
			renderWeekView({ initialDate: newYearsDay2023, weekNumbers: true })

			expect(screen.getByTestId('week-number')).toHaveTextContent('1')
		})

		test("weekNumberCalculation='ISO' counts ISO weeks", () => {
			cleanup()
			renderWeekView({
				initialDate: newYearsDay2023,
				weekNumberCalculation: 'ISO',
			})

			expect(screen.getByTestId('week-number')).toHaveTextContent('52')
		})

		test('numbers the first drawn day, whichever day of the week is current', () => {
			const numberFor = (iso: string, extra = {}) => {
				cleanup()
				renderWeekView({
					initialDate: iso,
					weekNumberCalculation: 'ISO',
					...extra,
				})
				return screen.getByTestId('week-number').textContent
			}

			const sundayFirst = ['2025-03-09', '2025-03-12', '2025-03-15'].map(
				(day) => numberFor(`${day}T12:00:00Z`)
			)
			expect(sundayFirst).toEqual(['10', '10', '10'])
			expect(numberFor('2027-01-01T12:00:00Z')).toBe('52')

			const mondayFirst = ['2025-03-05', '2025-03-09'].map((day) =>
				numberFor(`${day}T12:00:00Z`, { firstDayOfWeek: 1 })
			)
			expect(mondayFirst).toEqual(['10', '10'])
			expect(subtract(atUtc('2025-03-09T00:00:00Z'), 1, 'day').day).toBe(8)
		})
	})
})
