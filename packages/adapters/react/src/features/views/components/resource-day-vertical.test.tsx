import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { parseDate } from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { CalendarDndContext } from '@/features/drag-and-drop/components/calendar-dnd-context'
import { DayView } from '@/testing/view-harnesses'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = '2025-01-01T00:00:00Z'
const dateStr = '2025-01-01'

const renderResourceDayVertical = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			initialView="day"
			orientation="vertical"
			resources={mockResources}
			timezone="UTC"
			{...props}
		>
			<CalendarDndContext>
				<DayView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}

describe('ResourceDayVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource day view structure', () => {
		renderResourceDayVertical()

		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()
		expect(screen.getByText(/All day/i)).toBeInTheDocument()
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
	})

	test('renders resource columns in scroll area', () => {
		renderResourceDayVertical()

		expect(
			screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-1`)
		).toBeInTheDocument()
	})

	test('renders all day cells for each resource', () => {
		renderResourceDayVertical()
		expect(screen.getAllByTestId('all-day-row').length).toBe(2)
	})

	test('renders 15-minute slots when slotDuration is 15', () => {
		renderResourceDayVertical({ slotDuration: 15 })

		for (const mm of ['00', '15', '30', '45']) {
			expect(
				screen.getByTestId(`vertical-cell-${dateStr}-09-${mm}-resource-1`)
			).toBeInTheDocument()
		}
	})

	test('renders only hour slots by default', () => {
		renderResourceDayVertical()

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-1`)
		).toBeInTheDocument()
		for (const mm of ['15', '30', '45']) {
			expect(
				screen.queryByTestId(`vertical-cell-${dateStr}-09-${mm}-resource-1`)
			).not.toBeInTheDocument()
		}
	})

	test('shows all 24 hours when hideNonBusinessHours is false or omitted', () => {
		const businessHours = {
			daysOfWeek: ['wednesday'],
			startTime: 9,
			endTime: 17,
		}

		renderResourceDayVertical({ businessHours, hideNonBusinessHours: false })

		for (const hh of ['00', '08', '09', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}

		cleanup()
		renderResourceDayVertical({ businessHours })

		for (const hh of ['00', '08', '09', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}
	})

	test('does not crash when hideNonBusinessHours produces an empty hour range', () => {
		renderResourceDayVertical({
			businessHours: {
				daysOfWeek: ['wednesday'],
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

	test('hides non-business hours when hideNonBusinessHours is true', () => {
		renderResourceDayVertical({
			businessHours: {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: true,
		})

		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-23')).not.toBeInTheDocument()
	})

	test('positions event at 0% top when event starts at business hour start with hideNonBusinessHours true', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-9am',
			title: 'Resource Morning Meeting',
			start: '2025-01-01T09:00:00+00:00',
			end: '2025-01-01T10:00:00+00:00',
			resourceId: '1',
		}

		renderResourceDayVertical({
			businessHours: {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Resource Morning Meeting')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false in ResourceDayVertical', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-9am-full',
			title: 'Resource Morning Full',
			start: '2025-01-01T09:00:00+00:00',
			end: '2025-01-01T10:00:00+00:00',
			resourceId: '1',
		}

		renderResourceDayVertical({
			businessHours: {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: false,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Resource Morning Full')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').not.toContain('top: 0%')
	})

	test('positions event at correct percentage when event is in middle of business hours', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-1pm',
			title: 'Resource Afternoon',
			start: '2025-01-01T13:00:00+00:00',
			end: '2025-01-01T14:00:00+00:00',
			resourceId: '1',
		}

		renderResourceDayVertical({
			businessHours: {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			},
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		const eventWrapper = screen
			.getByText('Resource Afternoon')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 50%')
	})

	test('customizes hour rendering when renderHour prop is provided', () => {
		const renderHour = (iso: string) => {
			const d = parseDate(iso, 'UTC')
			const hh = String(d?.hour ?? 0).padStart(2, '0')
			const mm = String(d?.minute ?? 0).padStart(2, '0')
			return <span data-testid={`custom-hour-${hh}`}>{`${hh}:${mm}`}</span>
		}

		renderResourceDayVertical({ renderHour })

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

			renderResourceDayVertical({ scrollTime: '08:00:00' })

			expect(scrollSpy).toHaveBeenCalled()
		})

		test('does not scroll when scrollTime is not provided', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceDayVertical()

			expect(scrollSpy).not.toHaveBeenCalled()
		})
	})

	describe('allDaySlot', () => {
		test('false removes every resource all-day row', () => {
			renderResourceDayVertical()
			expect(screen.getAllByTestId('all-day-row')).toHaveLength(
				mockResources.length
			)

			cleanup()
			renderResourceDayVertical({ allDaySlot: false })

			expect(screen.queryAllByTestId('all-day-row')).toHaveLength(0)
		})
	})

	test('is a resource calendar with no lanes while a resources function is pending', () => {
		const neverResolves = () => new Promise<Resource[]>(() => undefined)
		cleanup()
		render(
			<CalendarProvider
				events={[]}
				initialDate={initialDate}
				initialView="day"
				orientation="vertical"
				resourcesFetcher={neverResolves}
				timezone="UTC"
			>
				<CalendarDndContext>
					<DayView />
				</CalendarDndContext>
			</CalendarProvider>
		)

		expect(screen.getByTestId('resource-columns-header')).toBeInTheDocument()
		expect(screen.queryByTestId('day-view-header')).toBeNull()
	})
})
