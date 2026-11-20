import { describe, expect, it, mock } from 'bun:test'
import { recurrencePlugin } from '@ilamy/calendar-recurrence'
import type {
	BusinessHours,
	CalendarEvent,
	Resource,
	WeekDays,
} from '@ilamy/types'
import {
	add,
	dayKey,
	endOf,
	formatDate,
	now,
	parseDate,
	startOf,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { act, render } from '@testing-library/react'
import type React from 'react'
import { RRule } from 'rrule'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { CalendarContextType } from './calendar-context'
import type { CalendarProviderProps } from './calendar-provider'
import { CalendarProvider } from './calendar-provider'

const mustUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const utcIso = (iso: string | undefined): string =>
	iso ? toUtcIso(mustUtc(iso)) : ''

// Default test props
const defaultProps = {
	events: [] as CalendarEvent[],
	dayMaxEvents: 5,
	firstDayOfWeek: 0,
	timezone: 'UTC',
}

// Compact event factory: id doubles as title; July 1 9-10am unless overridden.
const mkEvent = (
	id: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: id,
	start: '2025-07-01T09:00:00.000Z',
	end: '2025-07-01T10:00:00.000Z',
	...extra,
})

// Factory for a daily recurring event starting July 1 at 9am
const makeDailyRecurringEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'test-recurring',
	title: 'Daily Meeting',
	start: '2025-07-01T09:00:00.000Z',
	end: '2025-07-01T10:00:00.000Z',
	rrule: {
		freq: RRule.DAILY,
		interval: 1,
		dtstart: new Date('2025-07-01T09:00:00.000Z'),
	},
	uid: 'test-recurring@calendar.test',
	...overrides,
})

// Test component to capture context values
const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId?: string
}) => {
	const { currentDate, timezone } = useSmartCalendarContext()
	const parsed = parseDate(currentDate, timezone)

	if (!testId || !parsed) {
		return <>{children}</>
	}

	return (
		<>
			<div data-testid={`${testId}-year`}>{parsed.year}</div>
			<div data-testid={`${testId}-month`}>{parsed.month - 1}</div>
			<div data-testid={`${testId}-date`}>{parsed.day}</div>
			{children}
		</>
	)
}

// Render helper function
const renderProvider = (
	children: React.ReactNode,
	props: Partial<CalendarProviderProps> = {},
	testId?: string
) => {
	return render(
		<CalendarProvider {...defaultProps} {...props}>
			<TestWrapper testId={testId}>{children}</TestWrapper>
		</CalendarProvider>
	)
}

// Test component to access context
function TestComponent() {
	const { events, getEventsForDateRange } = useSmartCalendarContext()

	const rangeEvents = getEventsForDateRange(
		'2025-07-01T00:00:00.000Z',
		'2025-07-07T23:59:59.999Z'
	)

	return (
		<div>
			<div data-testid="total-events">{events.length}</div>
			<div data-testid="range-events">{rangeEvents.length}</div>
		</div>
	)
}

describe('CalendarProvider - On-Demand Generation', () => {
	it('should generate recurring events on-demand for current view only', () => {
		const recurringEvent = makeDailyRecurringEvent()

		const { getByTestId } = renderProvider(<TestComponent />, {
			events: [recurringEvent],
			dayMaxEvents: 3,
			plugins: [recurrencePlugin()],
		})

		const rangeEventsCount = Number.parseInt(
			getByTestId('range-events').textContent || '0',
			10
		)
		expect(rangeEventsCount).toBe(7)
	})

	it('should handle non-recurring events efficiently', () => {
		const nonRecurringEvent: CalendarEvent = {
			id: 'test-single',
			title: 'One-time Meeting',
			start: '2025-07-03T09:00:00.000Z',
			end: '2025-07-03T10:00:00.000Z',
		}

		const { getByTestId } = renderProvider(<TestComponent />, {
			events: [nonRecurringEvent],
			dayMaxEvents: 3,
		})

		const rangeEventsCount = Number.parseInt(
			getByTestId('range-events').textContent || '0',
			10
		)
		expect(rangeEventsCount).toBe(1)
	})

	it('should exclude events with EXDATE exclusions', () => {
		const recurringEventWithExdates = makeDailyRecurringEvent({
			id: 'test-excluded',
			title: 'Meeting with Exclusions',
			uid: 'test-excluded@calendar.test',
			exdates: [
				'2025-07-01T09:00:00.000Z',
				'2025-07-02T09:00:00.000Z',
				'2025-07-03T09:00:00.000Z',
				'2025-07-04T09:00:00.000Z',
				'2025-07-05T09:00:00.000Z',
				'2025-07-06T09:00:00.000Z',
				'2025-07-07T09:00:00.000Z',
			],
		})

		const { getByTestId } = renderProvider(<TestComponent />, {
			events: [recurringEventWithExdates],
			dayMaxEvents: 3,
			plugins: [recurrencePlugin()],
		})

		const rangeEventsCount = Number.parseInt(
			getByTestId('range-events').textContent || '0',
			10
		)
		expect(rangeEventsCount).toBe(0)
	})
})

describe('CalendarProvider - recurring event integration', () => {
	it('should not create duplicate events when recurring events are modified', () => {
		const baseEvent: CalendarEvent = {
			id: 'daily-standup',
			title: 'Daily Standup',
			start: '2025-01-01T09:00:00.000Z',
			end: '2025-01-01T09:30:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-01T09:00:00.000Z'),
			},
			uid: 'daily-standup@calendar',
		}

		const modifiedInstance: CalendarEvent = {
			id: 'daily-standup_modified_123',
			title: 'Daily Standup',
			start: '2025-01-03T10:00:00.000Z',
			end: '2025-01-03T10:30:00.000Z',
			recurrenceId: '2025-01-03T09:00:00.000Z',
			uid: 'daily-standup@calendar',
		}

		const baseEventWithExdate: CalendarEvent = {
			...baseEvent,
			exdates: ['2025-01-03T09:00:00.000Z'],
		}

		const events = [baseEventWithExdate, modifiedInstance]

		function TestNoDuplicates() {
			const { getEventsForDateRange } = useSmartCalendarContext()

			const rangeEvents = getEventsForDateRange(
				'2025-01-01T00:00:00.000Z',
				'2025-01-05T00:00:00.000Z'
			)

			const jan3Events = rangeEvents.filter(
				(event) => dayKey(mustUtc(event.start)) === '2025-01-03'
			)

			return (
				<div>
					<div data-testid="jan3-event-count">{jan3Events.length}</div>
					<div data-testid="jan3-event-hour">
						{jan3Events[0] ? mustUtc(jan3Events[0].start).hour : 'none'}
					</div>
					<div data-testid="jan3-event-id">{jan3Events[0]?.id || 'none'}</div>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestNoDuplicates />, {
			events,
			dayMaxEvents: 5,
			plugins: [recurrencePlugin()],
		})

		expect(getByTestId('jan3-event-count').textContent).toBe('1')
		expect(getByTestId('jan3-event-hour').textContent).toBe('10')
		expect(getByTestId('jan3-event-id').textContent).toBe(
			'daily-standup_modified_123'
		)
	})

	it('should call regular callbacks for recurring event operations', () => {
		const onEventUpdate = mock(() => {})
		const onEventAdd = mock(() => {})
		const onEventDelete = mock(() => {})

		const recurringEvent: CalendarEvent = {
			id: 'weekly-meeting',
			uid: 'weekly-meeting@ilamy.calendar',
			title: 'Weekly Meeting',
			start: '2025-01-06T10:00:00.000Z',
			end: '2025-01-06T11:00:00.000Z',
			rrule: {
				freq: RRule.WEEKLY,
				interval: 1,
				byweekday: [RRule.MO],
				dtstart: new Date('2025-01-06T10:00:00.000Z'),
			},
			exdates: [],
		}

		const TestRecurringCallbacks = () => {
			const { applyScopedEdit, applyScopedDelete } = useSmartCalendarContext()

			const handleUpdateRecurring = () => {
				applyScopedEdit(
					recurringEvent,
					{ title: 'Updated Weekly Meeting' },
					'this'
				)
			}

			const handleDeleteRecurring = () => {
				applyScopedDelete(recurringEvent, 'this')
			}

			return (
				<div>
					<button
						data-testid="update-recurring"
						onClick={handleUpdateRecurring}
						type="button"
					>
						Update Recurring
					</button>
					<button
						data-testid="delete-recurring"
						onClick={handleDeleteRecurring}
						type="button"
					>
						Delete Recurring
					</button>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestRecurringCallbacks />, {
			events: [recurringEvent],
			dayMaxEvents: 5,
			onEventUpdate,
			onEventAdd,
			onEventDelete,
			plugins: [recurrencePlugin()],
		})

		act(() => getByTestId('update-recurring').click())
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		expect(onEventUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'weekly-meeting',
				exdates: ['2025-01-06T10:00:00.000Z'],
			})
		)

		expect(onEventAdd).toHaveBeenCalledTimes(1)
		expect(onEventAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Updated Weekly Meeting',
				id: expect.stringContaining('weekly-meeting_modified_'),
			})
		)

		act(() => getByTestId('delete-recurring').click())
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		expect(onEventDelete).toHaveBeenCalledTimes(1)
		expect(onEventDelete).toHaveBeenCalledWith(
			expect.objectContaining({
				recurrenceId: '2025-01-06T10:00:00.000Z',
				id: expect.stringContaining('weekly-meeting_modified_'),
			})
		)
	})

	it('should call onEventUpdate for rrule changes', () => {
		const onEventUpdate = mock(() => {})
		const onEventAdd = mock(() => {})

		const recurringEvent: CalendarEvent = {
			id: 'daily-standup',
			uid: 'daily-standup@ilamy.calendar',
			title: 'Daily Standup',
			start: '2025-01-06T09:00:00.000Z',
			end: '2025-01-06T09:30:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-06T09:00:00.000Z'),
			},
			exdates: [],
		}

		const TestRruleUpdate = () => {
			const { applyScopedEdit } = useSmartCalendarContext()

			const handleUpdateRrule = () => {
				applyScopedEdit(
					recurringEvent,
					{
						rrule: {
							freq: RRule.WEEKLY,
							interval: 1,
							byweekday: [RRule.MO],
							dtstart: new Date('2025-01-06T09:00:00.000Z'),
						},
					},
					'all'
				)
			}

			return (
				<div>
					<button
						data-testid="update-rrule"
						onClick={handleUpdateRrule}
						type="button"
					>
						Update Rrule
					</button>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestRruleUpdate />, {
			events: [recurringEvent],
			dayMaxEvents: 5,
			onEventUpdate,
			onEventAdd,
			plugins: [recurrencePlugin()],
		})

		act(() => getByTestId('update-rrule').click())
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		expect(onEventUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'daily-standup',
				rrule: expect.objectContaining({
					freq: RRule.WEEKLY,
					byweekday: [RRule.MO],
				}),
			})
		)
		expect(onEventAdd).not.toHaveBeenCalled()
	})

	it('should call onEventUpdate for time/date changes in recurring events', () => {
		const onEventUpdate = mock((_event: CalendarEvent) => {})
		const onEventAdd = mock(() => {})

		const recurringEvent: CalendarEvent = {
			id: 'team-meeting',
			uid: 'team-meeting@ilamy.calendar',
			title: 'Team Meeting',
			start: '2025-01-06T14:00:00.000Z',
			end: '2025-01-06T15:00:00.000Z',
			rrule: {
				freq: RRule.WEEKLY,
				interval: 1,
				byweekday: [RRule.MO],
				dtstart: new Date('2025-01-06T14:00:00.000Z'),
			},
			exdates: [],
		}

		const TestTimeUpdate = () => {
			const { applyScopedEdit } = useSmartCalendarContext()

			const handleUpdateTime = () => {
				applyScopedEdit(
					recurringEvent,
					{
						start: '2025-01-06T10:00:00.000Z',
						end: '2025-01-06T11:00:00.000Z',
					},
					'all'
				)
			}

			return (
				<div>
					<button
						data-testid="update-time"
						onClick={handleUpdateTime}
						type="button"
					>
						Update Time
					</button>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestTimeUpdate />, {
			events: [recurringEvent],
			dayMaxEvents: 5,
			onEventUpdate,
			onEventAdd,
			plugins: [recurrencePlugin()],
		})

		act(() => getByTestId('update-time').click())
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		const updated = onEventUpdate.mock.calls.at(0)?.at(0)
		expect(updated?.id).toBe('team-meeting')
		expect(utcIso(updated?.start)).toBe('2025-01-06T10:00:00.000Z')
		expect(utcIso(updated?.end)).toBe('2025-01-06T11:00:00.000Z')
		expect(onEventAdd).not.toHaveBeenCalled()
	})

	it('should initialize with the specified initial view', () => {
		const TestInitialView = () => {
			const { view } = useSmartCalendarContext()
			return <div data-testid="current-view">{view}</div>
		}

		const { getByTestId } = renderProvider(<TestInitialView />, {
			dayMaxEvents: 5,
			initialView: 'week',
		})

		expect(getByTestId('current-view').textContent).toBe('week')
	})

	it('should default to month view when no initialView is provided', () => {
		const TestDefaultView = () => {
			const { view } = useSmartCalendarContext()
			return <div data-testid="current-view">{view}</div>
		}

		const { getByTestId } = renderProvider(<TestDefaultView />, {
			dayMaxEvents: 5,
		})

		expect(getByTestId('current-view').textContent).toBe('month')
	})

	it('should initialize with the specified initial date', () => {
		const { getByTestId } = renderProvider(
			<div />,
			{
				dayMaxEvents: 5,
				initialDate: '2025-06-15T10:00:00.000Z',
			},
			'current-date'
		)

		expect(getByTestId('current-date-year').textContent).toBe('2025')
		expect(getByTestId('current-date-month').textContent).toBe('5')
		expect(getByTestId('current-date-date').textContent).toBe('15')
	})

	it('should default to today when no initialDate is provided', () => {
		const today = now('UTC')

		const { getByTestId } = renderProvider(
			<div />,
			{
				dayMaxEvents: 5,
			},
			'current-date'
		)

		expect(getByTestId('current-date-year').textContent).toBe(
			today.year.toString()
		)
		expect(getByTestId('current-date-month').textContent).toBe(
			(today.month - 1).toString()
		)
		expect(getByTestId('current-date-date').textContent).toBe(
			today.day.toString()
		)
	})
})

describe('CalendarProvider - render stability', () => {
	it('keeps the context value referentially stable across identical re-renders', () => {
		const seenContexts: unknown[] = []
		const CaptureContext = () => {
			seenContexts.push(useSmartCalendarContext())
			return null
		}
		const events: CalendarEvent[] = []
		const buildCalendar = () => (
			<CalendarProvider dayMaxEvents={5} events={events} firstDayOfWeek={0}>
				<CaptureContext />
			</CalendarProvider>
		)

		const { rerender } = render(buildCalendar())
		rerender(buildCalendar())

		expect(seenContexts).toHaveLength(2)
		expect(seenContexts.at(1)).toBe(seenContexts.at(0))
	})

	it('keeps the context value when only inline handlers change, and calls the newest one', () => {
		const seenContexts: CalendarContextType[] = []
		const CaptureContext = () => {
			seenContexts.push(useSmartCalendarContext())
			return null
		}
		const events = [mkEvent('a')]
		const calls: string[] = []
		const buildCalendar = (label: string) => (
			<CalendarProvider
				events={events}
				onCellClick={() => calls.push(`cell:${label}`)}
				onDateChange={() => calls.push(`date:${label}`)}
				onEventClick={() => calls.push(`click:${label}`)}
				onEventsChange={() => calls.push(`change:${label}`)}
				onEventUpdate={() => calls.push(`update:${label}`)}
			>
				<CaptureContext />
			</CalendarProvider>
		)

		const { rerender } = render(buildCalendar('first'))
		rerender(buildCalendar('second'))
		const context = seenContexts.at(-1)
		act(() => {
			context?.updateEvent('a', { title: 'moved' })
			context?.onEventClick(mkEvent('a'))
			context?.onCellClick({
				start: '2025-07-01T09:00:00.000Z',
				end: '2025-07-01T10:00:00.000Z',
			})
			context?.nextPeriod()
		})

		expect(seenContexts.at(1)).toBe(seenContexts.at(0))
		expect(calls).toEqual([
			'update:second',
			'change:second',
			'click:second',
			'cell:second',
			'date:second',
		])
	})
})

describe('CalendarProvider - Resource Axis', () => {
	const TestResourceAxis = () => {
		const ctx = useSmartCalendarContext()
		const r1Events = ctx.getEventsForResource('r1')
		const crossEvent = r1Events.at(1)
		const isCross = crossEvent && ctx.isEventCrossResource(crossEvent)
		return (
			<div>
				<div data-testid="axis-resources">
					{(ctx.resources ?? []).map((r) => r.id).join(',')}
				</div>
				<div data-testid="axis-orientation">{ctx.orientation}</div>
				<div data-testid="axis-granularity">{ctx.weekViewGranularity}</div>
				<div data-testid="axis-r1-events">
					{r1Events.map((e) => e.id).join(',')}
				</div>
				<div data-testid="axis-resource-title">
					{ctx.getResourceById('r1')?.title ?? 'none'}
				</div>
				<div data-testid="axis-cross">{isCross ? 'cross' : 'single'}</div>
			</div>
		)
	}

	const renderResourceAxis = () => {
		const resources: Resource[] = [{ id: 'r1', title: 'Room 1' }]
		const events = [
			mkEvent('e1', { resourceId: 'r1' }),
			mkEvent('e2', { resourceIds: ['r1', 'r2'] }),
			mkEvent('e3'),
		]
		return renderProvider(<TestResourceAxis />, {
			events,
			initialDate: '2025-07-01T00:00:00.000Z',
			orientation: 'vertical',
			resources,
		})
	}

	it('exposes the resources passed as props', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-resources').textContent).toBe('r1')
	})

	it('exposes the orientation passed as props', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-orientation').textContent).toBe('vertical')
	})

	it('defaults weekViewGranularity to hourly', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-granularity').textContent).toBe('hourly')
	})

	it('getEventsForResource returns direct and cross-resource members, not unassigned', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-r1-events').textContent).toBe('e1,e2')
	})

	it('getResourceById resolves the full resource', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-resource-title').textContent).toBe('Room 1')
	})

	it('isEventCrossResource identifies multi-resource events', () => {
		const { getByTestId } = renderResourceAxis()
		expect(getByTestId('axis-cross').textContent).toBe('cross')
	})
})

describe('CalendarProvider - Business Hours', () => {
	it('should provide businessHours in context', () => {
		const businessHours: BusinessHours = {
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

		const TestComponent = () => {
			const { businessHours } = useSmartCalendarContext()
			return (
				<div data-testid="business-hours">{JSON.stringify(businessHours)}</div>
			)
		}

		const { getByTestId } = renderProvider(<TestComponent />, {
			businessHours,
		})

		const content = getByTestId('business-hours').textContent
		expect(content).toBe(JSON.stringify(businessHours))
	})
})

describe('firstDayOfWeek functionality', () => {
	it('should calculate correct week range when firstDayOfWeek is Monday', () => {
		const TestComponent = () => {
			const { getEventsForDateRange } = useSmartCalendarContext()
			const testDate = mustUtc('2025-10-15T00:00:00.000Z')
			const expectedStart = startOf(testDate, 'week', 1)
			const expectedEnd = endOf(add(expectedStart, 6, 'day'), 'day')
			const weekEvents = getEventsForDateRange(
				toOffsetIso(expectedStart),
				toOffsetIso(expectedEnd)
			)

			return (
				<div>
					<div data-testid="week-start-day">
						{formatDate(expectedStart, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="week-start-date">{expectedStart.day}</div>
					<div data-testid="week-end-day">
						{formatDate(expectedEnd, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="week-end-date">{expectedEnd.day}</div>
					<div data-testid="events-count">{weekEvents.length}</div>
				</div>
			)
		}

		const testEvent: CalendarEvent = {
			id: 'test-1',
			title: 'Test Event',
			start: '2025-10-14T10:00:00.000Z',
			end: '2025-10-14T11:00:00.000Z',
			uid: 'test-1@test.com',
		}

		const { getByTestId } = renderProvider(<TestComponent />, {
			events: [testEvent],
			firstDayOfWeek: 1,
			initialDate: '2025-10-15T00:00:00.000Z',
		})

		expect(getByTestId('week-start-day').textContent).toBe('Monday')
		expect(getByTestId('week-start-date').textContent).toBe('13')
		expect(getByTestId('week-end-day').textContent).toBe('Sunday')
		expect(getByTestId('week-end-date').textContent).toBe('19')
		expect(getByTestId('events-count').textContent).toBe('1')
	})

	it('should calculate correct week range when current date is Sunday and firstDayOfWeek is Monday', () => {
		const TestComponent = () => {
			const testDate = mustUtc('2025-10-12T00:00:00.000Z')
			const expectedStart = startOf(testDate, 'week', 1)
			const expectedEnd = endOf(add(expectedStart, 6, 'day'), 'day')

			return (
				<div>
					<div data-testid="week-start-day">
						{formatDate(expectedStart, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="week-start-date">{expectedStart.day}</div>
					<div data-testid="week-end-day">
						{formatDate(expectedEnd, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="week-end-date">{expectedEnd.day}</div>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestComponent />, {
			firstDayOfWeek: 1,
			initialDate: '2025-10-12T00:00:00.000Z',
		})

		expect(getByTestId('week-start-day').textContent).toBe('Monday')
		expect(getByTestId('week-start-date').textContent).toBe('6')
		expect(getByTestId('week-end-day').textContent).toBe('Sunday')
		expect(getByTestId('week-end-date').textContent).toBe('12')
	})

	it('should calculate correct month range when firstDayOfWeek is Monday', () => {
		const TestComponent = () => {
			const oct1 = mustUtc('2025-10-01T00:00:00.000Z')
			const expectedStart = startOf(startOf(oct1, 'month'), 'week', 1)
			const monthEnd = endOf(oct1, 'month')
			const expectedEnd = endOf(
				add(startOf(monthEnd, 'week', 1), 6, 'day'),
				'day'
			)

			return (
				<div>
					<div data-testid="month-start-day">
						{formatDate(expectedStart, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="month-start-date">
						{formatDate(
							expectedStart,
							{ month: 'short', day: 'numeric' },
							'en-US'
						)}
					</div>
					<div data-testid="month-end-day">
						{formatDate(expectedEnd, { weekday: 'long' }, 'en-US')}
					</div>
					<div data-testid="month-end-date">
						{formatDate(
							expectedEnd,
							{ month: 'short', day: 'numeric' },
							'en-US'
						)}
					</div>
				</div>
			)
		}

		const { getByTestId } = renderProvider(<TestComponent />, {
			firstDayOfWeek: 1,
			initialDate: '2025-10-01T00:00:00.000Z',
		})

		expect(getByTestId('month-start-day').textContent).toBe('Monday')
		expect(getByTestId('month-start-date').textContent).toBe('Sep 29')
		expect(getByTestId('month-end-day').textContent).toBe('Sunday')
		expect(getByTestId('month-end-date').textContent).toBe('Nov 2')
	})
})

describe('CalendarProvider - slotDuration and snapDuration', () => {
	const ReadSlotAndSnap = () => {
		const { slotDuration, snapDuration } = useSmartCalendarContext()
		return (
			<div data-testid="slot-and-snap">{`${slotDuration}/${snapDuration}`}</div>
		)
	}
	const renderSlotAndSnap = (props: Partial<CalendarProviderProps>) =>
		renderProvider(<ReadSlotAndSnap />, props)

	it('defaults to hourly slots with no snap of its own', () => {
		const { getByTestId } = renderSlotAndSnap({})
		expect(getByTestId('slot-and-snap').textContent).toBe('60/undefined')
	})

	it.each([15, 30, 60] as const)(
		'draws a %i-minute slot as asked',
		(slotDuration) => {
			const { getByTestId } = renderSlotAndSnap({ slotDuration })
			expect(getByTestId('slot-and-snap').textContent).toBe(
				`${slotDuration}/undefined`
			)
		}
	)

	it('hands on the snap duration', () => {
		const { getByTestId } = renderSlotAndSnap({
			slotDuration: 60,
			snapDuration: 15,
		})
		expect(getByTestId('slot-and-snap').textContent).toBe('60/15')
	})
})
