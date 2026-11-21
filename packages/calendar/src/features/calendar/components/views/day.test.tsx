import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import {
	dayKey,
	formatDate,
	now,
	parseDate,
	toOffsetIso,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { generateMockEvents } from '@/testing/generator'
import { DayView } from '@/testing/view-harnesses'

const mockEvents: CalendarEvent[] = generateMockEvents()
const firstDayOfWeek = 0
const dayMaxEvents = 3
let locale = 'en'

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

const renderDayView = (props = {}) => {
	const testId = 'current-date'
	return render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			firstDayOfWeek={firstDayOfWeek}
			initialView="day"
			locale={locale}
			timezone="UTC"
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
		locale = 'en'
		cleanup()
	})

	test('renders day view structure with proper layout', () => {
		renderDayView()

		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-header')).toBeInTheDocument()
		expect(
			screen.getAllByTestId('vertical-grid-all-day').length
		).toBeGreaterThan(0)
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
	})

	test('renders time column with 24 hour slots', () => {
		renderDayView()

		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-12')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('renders events column structure', () => {
		renderDayView()
		const today = dayKey(now('UTC'))

		expect(
			screen.getByTestId(`vertical-col-day-col-${today}`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${today}-00-00`)
		).toBeInTheDocument()
	})

	test('displays current date correctly in header', () => {
		const dateIso = '2025-06-15T12:00:00Z'
		const zoned = parseDate(dateIso, 'UTC')
		renderDayView({ initialDate: dateIso })

		const header = screen.getByTestId('day-view-header')
		let expectedHeader = ''
		if (zoned) {
			expectedHeader = formatDate(
				zoned,
				{ month: 'long', day: 'numeric', year: 'numeric' },
				'en'
			)
		}
		expect(header).toHaveTextContent(expectedHeader)

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('6')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
	})

	test('hides today indicator by default (D3) and shows it when nowIndicator is true', () => {
		const today = now('UTC')
		renderDayView({ initialDate: toOffsetIso(today) })

		expect(screen.queryAllByTestId('current-time-indicator')).toHaveLength(0)

		cleanup()
		renderDayView({ initialDate: toOffsetIso(today), nowIndicator: true })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent(
			String(today.year)
		)
		expect(screen.getByTestId('current-date-month')).toHaveTextContent(
			String(today.month)
		)
		expect(screen.getByTestId('current-date-date')).toHaveTextContent(
			String(today.day)
		)
		expect(
			screen.queryAllByTestId('current-time-indicator').length
		).toBeGreaterThan(0)
	})

	test('renders all-day events section', () => {
		renderDayView()

		expect(
			screen.getAllByTestId('vertical-grid-all-day').length
		).toBeGreaterThan(0)
		expect(screen.getByText('All day')).toBeInTheDocument()
	})

	test('handles different locale settings', () => {
		renderDayView({ locale: 'en' })
		expect(screen.getByTestId('vertical-grid-header')).toBeInTheDocument()
	})

	test('renders time grid with proper height calculation', () => {
		renderDayView()
		expect(screen.getAllByTestId('vertical-grid-body').length).toBeGreaterThan(
			0
		)
	})

	test('initializes with specified initial date - different day', () => {
		renderDayView({ initialDate: '2025-06-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('6')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
	})

	test('initializes with specified initial date - past date', () => {
		renderDayView({ initialDate: '2020-01-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('1')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
	})

	test('initializes with specified initial date - future date', () => {
		renderDayView({ initialDate: '2030-12-25T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('12')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')
	})

	test('defaults to current day when no initial date provided', () => {
		const today = now('UTC')
		renderDayView()

		expect(screen.getByTestId('current-date-year')).toHaveTextContent(
			String(today.year)
		)
		expect(screen.getByTestId('current-date-month')).toHaveTextContent(
			String(today.month)
		)
		expect(screen.getByTestId('current-date-date')).toHaveTextContent(
			String(today.day)
		)
	})

	test('renders with proper scrollable structure', () => {
		renderDayView()
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
	})

	test('applies business hours shading without disabling clicks (4.0.5)', () => {
		const monday = '2025-01-06T00:00:00Z'
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({ initialDate: monday, businessHours })

		const businessCell = screen.getByTestId('vertical-cell-2025-01-06-10-00')
		expect(businessCell.getAttribute('data-non-business')).toBeNull()
		expect(businessCell.getAttribute('data-disabled')).toBe('false')
		expect(businessCell.className).toContain('cursor-pointer')

		const nonBusinessCell = screen.getByTestId('vertical-cell-2025-01-06-08-00')
		expect(nonBusinessCell.getAttribute('data-non-business')).toBe('true')
		expect(nonBusinessCell.getAttribute('data-disabled')).toBe('false')
		expect(nonBusinessCell.className).toContain('text-muted-foreground')
		expect(nonBusinessCell.className).toContain('cursor-pointer')

		const endBusinessCell = screen.getByTestId('vertical-cell-2025-01-06-17-00')
		expect(endBusinessCell.getAttribute('data-non-business')).toBe('true')
		expect(endBusinessCell.getAttribute('data-disabled')).toBe('false')
	})

	test('applies shading at exact boundary times (9am start, 5pm end)', () => {
		const monday = '2025-01-06T00:00:00Z'
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({ initialDate: monday, businessHours, slotDuration: 15 })

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
				.getByTestId('vertical-cell-2025-01-06-16-45')
				.getAttribute('data-non-business')
		).toBeNull()
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-08-45')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('respects businessHours with different weekdays', () => {
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({ initialDate: '2025-01-06T00:00:00Z', businessHours })
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-10-00')
				.getAttribute('data-non-business')
		).toBeNull()

		cleanup()
		renderDayView({ initialDate: '2025-01-05T00:00:00Z', businessHours })
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-05-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles custom business hours (Tuesday-Thursday, 10am-3pm)', () => {
		const businessHours = {
			daysOfWeek: ['tuesday', 'wednesday', 'thursday'],
			startTime: 10,
			endTime: 15,
		}

		renderDayView({ initialDate: '2025-01-07T00:00:00Z', businessHours })
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

		cleanup()
		renderDayView({ initialDate: '2025-01-06T00:00:00Z', businessHours })
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-06-11-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles edge case: businessHours with single day', () => {
		const businessHours = {
			daysOfWeek: ['wednesday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({ initialDate: '2025-01-08T00:00:00Z', businessHours })
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-08-10-00')
				.getAttribute('data-non-business')
		).toBeNull()

		cleanup()
		renderDayView({ initialDate: '2025-01-07T00:00:00Z', businessHours })
		expect(
			screen
				.getByTestId('vertical-cell-2025-01-07-10-00')
				.getAttribute('data-non-business')
		).toBe('true')
	})

	test('handles no businessHours prop (all times are unshaded and clickable)', () => {
		renderDayView({ initialDate: '2025-01-06T00:00:00Z' })
		const mondayCell = screen.getByTestId('vertical-cell-2025-01-06-10-00')
		expect(mondayCell.getAttribute('data-non-business')).toBeNull()
		expect(mondayCell.className).toContain('cursor-pointer')

		cleanup()
		renderDayView({ initialDate: '2025-01-05T00:00:00Z' })
		const sundayCell = screen.getByTestId('vertical-cell-2025-01-05-20-00')
		expect(sundayCell.getAttribute('data-non-business')).toBeNull()
		expect(sundayCell.className).toContain('cursor-pointer')
	})

	test('verifies 15-minute time slot granularity with business hours', () => {
		const businessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours,
			slotDuration: 15,
		})

		for (const slot of ['09-00', '09-15', '09-30', '09-45']) {
			expect(
				screen
					.getByTestId(`vertical-cell-2025-01-06-${slot}`)
					.getAttribute('data-non-business')
			).toBeNull()
		}

		expect(
			screen.getByTestId('vertical-cell-2025-01-06-09-00').className
		).toContain('border-dashed')
		expect(
			screen.getByTestId('vertical-cell-2025-01-06-09-45').className
		).not.toContain('border-dashed')

		for (const slot of ['08-00', '08-15', '08-30', '08-45']) {
			expect(
				screen
					.getByTestId(`vertical-cell-2025-01-06-${slot}`)
					.getAttribute('data-non-business')
			).toBe('true')
		}
	})

	test('displays time in 24-hour format when timeFormat is 24-hour', () => {
		renderDayView({ timeFormat: '24-hour' })

		for (const hh of ['00', '12', '13', '23']) {
			expect(
				screen.getByTestId(`vertical-time-${hh}`).textContent || ''
			).not.toMatch(/AM|PM/i)
		}
	})

	test('displays time in 12-hour format when timeFormat is 12-hour', () => {
		renderDayView({ timeFormat: '12-hour' })

		for (const hh of ['00', '12', '13', '23']) {
			expect(
				screen.getByTestId(`vertical-time-${hh}`).textContent || ''
			).toMatch(/AM|PM/i)
		}
	})

	test('defaults to 12-hour format when timeFormat is not provided', () => {
		renderDayView()

		expect(screen.getByTestId('vertical-time-00').textContent || '').toMatch(
			/AM|PM/i
		)
		expect(screen.getByTestId('vertical-time-12').textContent || '').toMatch(
			/AM|PM/i
		)
	})

	test('correctly formats all 24 hours in 24-hour format', () => {
		renderDayView({ timeFormat: '24-hour' })

		for (let hour = 0; hour < 24; hour++) {
			const hourStr = String(hour).padStart(2, '0')
			expect(
				screen.getByTestId(`vertical-time-${hourStr}`).textContent || ''
			).not.toMatch(/AM|PM/i)
		}
	})

	test('shows only the rows between slotMinTime and slotMaxTime', () => {
		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			slotMinTime: '08:00',
			slotMaxTime: '18:00',
		})

		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-07')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-18')).not.toBeInTheDocument()
	})

	test('hides non-business hours when hideNonBusinessHours is true', () => {
		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
		})

		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-23')).not.toBeInTheDocument()
	})

	test('shows all hours if hideNonBusinessHours is true but businessHours is missing', () => {
		renderDayView({ hideNonBusinessHours: true })

		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('shows all 24 hours when hideNonBusinessHours is false or omitted', () => {
		const businessHours = { daysOfWeek: ['monday'], startTime: 9, endTime: 17 }
		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours,
			hideNonBusinessHours: false,
		})

		for (const hh of ['00', '08', '09', '16', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}
	})

	test('scroll area uses flex column container for scroll containment', () => {
		renderDayView()

		const container = screen.getByTestId('vertical-grid-container')
		expect(container.className).toContain('flex')
		expect(container.className).toContain('flex-col')
		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
	})

	test('positions event at 0% top when event starts at business hour start with hideNonBusinessHours true', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-9am',
			title: 'Morning Meeting',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
		}

		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventElement = screen.getByText('Morning Meeting')
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false (24-hour grid)', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-9am-full',
			title: 'Morning Meeting Full Day',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
		}

		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
			hideNonBusinessHours: false,
			events: [testEvent],
		})

		const eventElement = screen.getByText('Morning Meeting Full Day')
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').not.toContain('top: 0%')
	})

	test('positions event at correct percentage when event is in middle of business hours', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-1pm',
			title: 'Afternoon Meeting',
			start: '2025-01-06T13:00:00+00:00',
			end: '2025-01-06T14:00:00+00:00',
		}

		renderDayView({
			initialDate: '2025-01-06T00:00:00Z',
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventElement = screen.getByText('Afternoon Meeting')
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 50%')
	})

	test('renders only hour slots by default (no sub-hour subdivisions)', () => {
		renderDayView({ initialDate: '2025-01-06T00:00:00Z' })

		expect(
			screen.getByTestId('vertical-cell-2025-01-06-09-00')
		).toBeInTheDocument()
		expect(
			screen.queryByTestId('vertical-cell-2025-01-06-09-15')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('vertical-cell-2025-01-06-09-30')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('vertical-cell-2025-01-06-09-45')
		).not.toBeInTheDocument()
	})

	test('renders half-hour slots when slotDuration is 30', () => {
		renderDayView({ initialDate: '2025-01-06T00:00:00Z', slotDuration: 30 })

		expect(
			screen.getByTestId('vertical-cell-2025-01-06-09-00')
		).toBeInTheDocument()
		expect(
			screen.getByTestId('vertical-cell-2025-01-06-09-30')
		).toBeInTheDocument()
		expect(
			screen.queryByTestId('vertical-cell-2025-01-06-09-15')
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId('vertical-cell-2025-01-06-09-45')
		).not.toBeInTheDocument()
	})

	test('renders quarter-hour slots when slotDuration is 15', () => {
		renderDayView({ initialDate: '2025-01-06T00:00:00Z', slotDuration: 15 })

		for (const mm of ['00', '15', '30', '45']) {
			expect(
				screen.getByTestId(`vertical-cell-2025-01-06-09-${mm}`)
			).toBeInTheDocument()
		}
	})

	test('customizes hour rendering when renderHour prop is provided', () => {
		const renderHour = (iso: string) => {
			const d = parseDate(iso, 'UTC')
			const hh = String(d?.hour ?? 0).padStart(2, '0')
			const mm = String(d?.minute ?? 0).padStart(2, '0')
			return <span data-testid={`custom-hour-${hh}`}>{`${hh}:${mm}`}</span>
		}

		renderDayView({ renderHour })

		expect(screen.getByTestId('custom-hour-00')).toHaveTextContent('00:00')
		expect(screen.getByTestId('custom-hour-12')).toHaveTextContent('12:00')
		expect(screen.getByTestId('custom-hour-23')).toHaveTextContent('23:00')
	})

	describe('scrollTime', () => {
		const originalScrollTo = Element.prototype.scrollTo

		afterEach(() => {
			Element.prototype.scrollTo = originalScrollTo
		})

		test('scrolls the viewport when scrollTime is set', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderDayView({ scrollTime: '08:00:00' })

			expect(scrollSpy).toHaveBeenCalled()
		})

		test('does not scroll when scrollTime is not provided', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderDayView()

			expect(scrollSpy).not.toHaveBeenCalled()
		})
	})

	describe('allDaySlot', () => {
		test('is on by default', () => {
			renderDayView()
			expect(screen.getByTestId('all-day-row')).toBeInTheDocument()
		})

		test('false removes the all-day row', () => {
			renderDayView({ allDaySlot: false })
			expect(screen.queryByTestId('all-day-row')).not.toBeInTheDocument()
		})
	})
})
