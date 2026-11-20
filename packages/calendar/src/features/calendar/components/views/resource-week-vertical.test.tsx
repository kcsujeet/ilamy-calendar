import { beforeEach, describe, expect, test } from 'bun:test'
import type {
	CalendarEvent,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import {
	dayKey,
	getWeekNumber,
	parseDate,
	startOf,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/features/calendar/components/drag-and-drop/calendar-dnd-context'
import { weekView } from '@/features/calendar/components/views/week'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	resourceWeekInitialDate as initialDate,
	noEvents,
	twoResources,
} from '@/testing/resource-test-fixtures'
import { WeekView } from '@/testing/view-harnesses'

const initialZoned = parseDate(initialDate, 'UTC')
if (!initialZoned) {
	throw new Error(`Invalid resourceWeekInitialDate: ${initialDate}`)
}
const dateStr = dayKey(initialZoned)
const firstDayOfInitialWeek = dayKey(startOf(initialZoned, 'week', 0))
const initialWeekNumber = getWeekNumber(
	startOf(initialZoned, 'week', 0),
	'local'
)

const renderResourceWeekVertical = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={noEvents}
			initialDate={initialDate}
			initialView="week"
			orientation="vertical"
			resources={twoResources}
			timezone="UTC"
			{...props}
		>
			<CalendarDndContext>
				<WeekView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}

describe('ResourceWeekVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource week view structure', () => {
		renderResourceWeekVertical()

		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()
		expect(screen.getByText(/All day/i)).toBeInTheDocument()
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
	})

	test('day headers show only the day number, not the M/D slash format (issue #157)', () => {
		renderResourceWeekVertical()

		expect(screen.queryAllByText(/^\d{1,2}\/\d{1,2}$/)).toHaveLength(0)
		expect(screen.getAllByText('Wed').length).toBeGreaterThan(0)
	})

	test('daily-mode day column shows only the day number, not M/D (issue #157)', () => {
		renderResourceWeekVertical({ weekViewGranularity: 'daily' })

		expect(screen.queryAllByText(/^\d{1,2}\/\d{1,2}$/)).toHaveLength(0)
		expect(screen.getAllByText('Wed').length).toBeGreaterThan(0)
	})

	test('renders day columns for each resource', () => {
		renderResourceWeekVertical()

		expect(
			screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
		).toBeInTheDocument()
	})

	test('renders all-day row for each resource', () => {
		renderResourceWeekVertical()
		expect(screen.getAllByTestId('all-day-row').length).toBe(2)
	})

	test('renders dates header row', () => {
		renderResourceWeekVertical()
		expect(screen.getAllByText('Sun').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Sat').length).toBeGreaterThan(0)
	})

	test('shows all 24 hours when hideNonBusinessHours is false or omitted', () => {
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderResourceWeekVertical({ businessHours, hideNonBusinessHours: false })
		for (const hh of ['00', '08', '09', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}

		cleanup()
		renderResourceWeekVertical({ businessHours })
		for (const hh of ['00', '08', '09', '17', '23']) {
			expect(screen.getByTestId(`vertical-time-${hh}`)).toBeInTheDocument()
		}
	})

	test('hides non-business hours when hideNonBusinessHours is true', () => {
		renderResourceWeekVertical({
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
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
			id: 'test-event-resource-week-9am',
			title: 'Resource Week Morning',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
			resourceId: '1',
		}

		renderResourceWeekVertical({
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
			.getByText('Resource Week Morning')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false in ResourceWeekVertical', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-week-9am-full',
			title: 'Resource Week Full',
			start: '2025-01-06T09:00:00+00:00',
			end: '2025-01-06T10:00:00+00:00',
			resourceId: '1',
		}

		renderResourceWeekVertical({
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
			.getByText('Resource Week Full')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').not.toContain('top: 0%')
	})

	test('positions event at correct percentage when event is in middle of business hours in ResourceWeekVertical', () => {
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-week-1pm',
			title: 'Resource Week Afternoon',
			start: '2025-01-06T13:00:00+00:00',
			end: '2025-01-06T14:00:00+00:00',
			resourceId: '1',
		}

		renderResourceWeekVertical({
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
			.getByText('Resource Week Afternoon')
			.closest('[style*="top"]')
		expect(eventWrapper?.getAttribute('style') || '').toContain('top: 50%')
	})

	describe('weekViewGranularity', () => {
		describe('default hourly mode behavior preserved', () => {
			test('renders time-col as first column when weekViewGranularity is hourly', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
				expect(
					screen.queryByTestId('vertical-col-date-col')
				).not.toBeInTheDocument()
			})

			test('renders all-day rows for each resource in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })
				expect(screen.getAllByTestId('all-day-row')).toHaveLength(2)
			})

			test('renders resource x day columns (7 days x 2 resources = 14) in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				expect(
					screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
				).toBeInTheDocument()
				expect(
					screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-2`)
				).toBeInTheDocument()
			})

			test('renders the date sub-header row in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })
				expect(
					screen.getAllByTestId('resource-week-time-label-00')
				).toHaveLength(14)
			})
		})

		describe('daily mode renders correctly', () => {
			test('renders date-col as first column in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				expect(screen.getByTestId('vertical-col-date-col')).toBeInTheDocument()
				expect(
					screen.queryByTestId('vertical-col-time-col')
				).not.toBeInTheDocument()
			})

			test('does not render all-day rows in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })
				expect(screen.queryAllByTestId('all-day-row')).toHaveLength(0)
			})

			test('renders one column per resource (not resource x day) in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				expect(
					screen.getByTestId('vertical-col-week-col-resource-1')
				).toBeInTheDocument()
				expect(
					screen.getByTestId('vertical-col-week-col-resource-2')
				).toBeInTheDocument()
				expect(
					screen.queryByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
				).not.toBeInTheDocument()
			})

			test('does not render the date sub-header row in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })
				expect(
					screen.queryAllByTestId(/resource-week-time-label-/)
				).toHaveLength(0)
			})

			test('shows week number in the header in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const weekLabel = screen.getByText('Week')
				expect(weekLabel.parentElement?.textContent).toContain(
					String(initialWeekNumber)
				)
			})

			test('firstCol (date-col) shows day name + date for each day of the week', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const dateCol = screen.getByTestId('vertical-col-date-col')
				for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
					expect(dateCol.textContent).toContain(day)
				}
			})

			test('firstCol (date-col) does not render hour labels (regression: duplicate HourLabel bug)', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const dateCol = screen.getByTestId('vertical-col-date-col')
				expect(dateCol.textContent).not.toMatch(/AM|PM/)
			})
		})

		describe('header structure differences', () => {
			test('hourly mode renders expanded header: resource row + date sub-header row', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				expect(
					screen.getAllByTestId('resource-week-time-label-00')
				).toHaveLength(14)
				expect(screen.getAllByTestId('all-day-row')).toHaveLength(2)
			})

			test('daily mode uses a compact header (h-12 class) and no h-24 in header', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				expect(
					screen.queryAllByTestId(/resource-week-time-label-/)
				).toHaveLength(0)
				expect(screen.queryAllByTestId('all-day-row')).toHaveLength(0)
			})
		})
	})

	describe('slotDuration', () => {
		test('renders only hour slots by default', () => {
			renderResourceWeekVertical()

			expect(
				screen.getByTestId(
					`vertical-cell-${firstDayOfInitialWeek}-09-00-resource-1`
				)
			).toBeInTheDocument()
			for (const mm of ['15', '30', '45']) {
				expect(
					screen.queryByTestId(
						`vertical-cell-${firstDayOfInitialWeek}-09-${mm}-resource-1`
					)
				).not.toBeInTheDocument()
			}
		})

		test('renders quarter-hour slots when slotDuration is 15', () => {
			renderResourceWeekVertical({ slotDuration: 15 })

			for (const mm of ['00', '15', '30', '45']) {
				expect(
					screen.getByTestId(
						`vertical-cell-${firstDayOfInitialWeek}-09-${mm}-resource-1`
					)
				).toBeInTheDocument()
			}
		})
	})

	describe('display toggles', () => {
		test('shows the week number in the day header unless weekNumbers is false', () => {
			renderResourceWeekVertical()
			expect(screen.getByTestId('week-number')).toHaveTextContent(
				String(initialWeekNumber)
			)

			cleanup()
			renderResourceWeekVertical({ weekNumbers: false })
			expect(screen.queryByTestId('week-number')).not.toBeInTheDocument()
		})

		test('numbers the first drawn day of the week, not the current date, in both headers', () => {
			renderResourceWeekVertical({ weekNumberCalculation: 'ISO' })
			expect(screen.getByTestId('week-number')).toHaveTextContent('52')

			cleanup()
			renderResourceWeekVertical({
				weekNumberCalculation: 'ISO',
				weekViewGranularity: 'daily',
			})
			expect(screen.getByTestId('week-number')).toHaveTextContent('52')
		})

		test('daily granularity shows the week number in the resource header, once', () => {
			renderResourceWeekVertical({ weekViewGranularity: 'daily' })

			expect(screen.getAllByTestId('week-number')).toHaveLength(1)
			expect(screen.getByTestId('week-number')).toHaveTextContent(
				String(initialWeekNumber)
			)
		})

		test.each(['hourly', 'daily'] as const)(
			'%s granularity animates the week number like the standard week view',
			(weekViewGranularity) => {
				renderResourceWeekVertical({ weekViewGranularity })

				expect(screen.getByTestId('week-number').className).toContain(
					'animate-in'
				)
			}
		)

		test('daily granularity: weekNumbers={false} hides the number and the Week label', () => {
			renderResourceWeekVertical({
				weekViewGranularity: 'daily',
				weekNumbers: false,
			})

			expect(screen.queryByTestId('week-number')).not.toBeInTheDocument()
			expect(screen.queryByText('Week')).not.toBeInTheDocument()
		})

		test('hourly granularity: weekNumbers={false} hides the Week label too', () => {
			renderResourceWeekVertical({ weekNumbers: false })
			expect(screen.queryByText('Week')).not.toBeInTheDocument()
		})

		test('allDaySlot={false} removes every resource all-day row', () => {
			renderResourceWeekVertical({ allDaySlot: false })
			expect(screen.queryAllByTestId('all-day-row')).toHaveLength(0)
		})
	})
})

describe('resource week vertical column specs', () => {
	const config: ViewConfig = {
		firstDayOfWeek: 0,
		resources: twoResources,
		orientation: 'vertical',
		weekViewGranularity: 'hourly',
		timezone: 'UTC',
	}

	test('gives every resource the same hour list for a given day', () => {
		const specs = weekView.columns?.(initialDate, config)
		const columns = (specs ?? []) as VerticalColumnSpec[]
		const firstResourceColumns = columns.filter(
			(column) => column.resource?.id === twoResources.at(0)?.id
		)
		const secondResourceColumns = columns.filter(
			(column) => column.resource?.id === twoResources.at(1)?.id
		)
		expect(firstResourceColumns).toHaveLength(7)
		firstResourceColumns.forEach((column, dayIndex) => {
			const sameDayOfSecondResource = secondResourceColumns.at(dayIndex)
			expect(column.days === sameDayOfSecondResource?.days).toBe(true)
		})
	})
})
