import {
	afterEach,
	beforeEach,
	describe,
	expect,
	setSystemTime,
	test,
} from 'bun:test'
import {
	type CalendarEvent,
	type DateRange,
	type IlamyPlugin,
	type IsoDateString,
	useIlamyCalendarContext,
} from '@ilamy/calendar'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import {
	add,
	dayKey,
	now,
	parseDate,
	toOffsetIso,
	toUtcIso,
} from '@ilamy/utils/temporal'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { yearPlugin } from './index'
import { YearView } from './year-view'

const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

const createTestEvents = (year: number): CalendarEvent[] => [
	{
		id: '1',
		title: 'Jan Event 1',
		start: `${year}-01-15T09:00:00.000Z`,
		end: `${year}-01-15T10:00:00.000Z`,
	},
	{
		id: '2',
		title: 'Jan Event 2',
		start: `${year}-01-15T11:00:00.000Z`,
		end: `${year}-01-15T12:00:00.000Z`,
	},
	{
		id: '3',
		title: 'Jan Event 3',
		start: `${year}-01-15T14:00:00.000Z`,
		end: `${year}-01-15T15:00:00.000Z`,
	},
	{
		id: '4',
		title: 'Jan Event 4',
		start: `${year}-01-20T09:00:00.000Z`,
		end: `${year}-01-20T10:00:00.000Z`,
	},
	{
		id: '5',
		title: 'Jan Event 5',
		start: `${year}-01-20T11:00:00.000Z`,
		end: `${year}-01-20T12:00:00.000Z`,
	},
	{
		id: '6',
		title: 'Jan Event 6',
		start: `${year}-01-25T09:00:00.000Z`,
		end: `${year}-01-25T10:00:00.000Z`,
	},
	{
		id: '7',
		title: 'Feb Event',
		start: `${year}-02-10T09:00:00.000Z`,
		end: `${year}-02-10T10:00:00.000Z`,
	},
	{
		id: '8',
		title: 'Mar Event 1',
		start: `${year}-03-05T09:00:00.000Z`,
		end: `${year}-03-05T10:00:00.000Z`,
	},
	{
		id: '9',
		title: 'Mar Event 2',
		start: `${year}-03-05T11:00:00.000Z`,
		end: `${year}-03-05T12:00:00.000Z`,
	},
	{
		id: '10',
		title: 'Mar Event 3',
		start: `${year}-03-05T13:00:00.000Z`,
		end: `${year}-03-05T14:00:00.000Z`,
	},
	{
		id: '11',
		title: 'Mar Event 4',
		start: `${year}-03-05T15:00:00.000Z`,
		end: `${year}-03-05T16:00:00.000Z`,
	},
	{
		id: '12',
		title: 'Mar Event 5',
		start: `${year}-03-05T17:00:00.000Z`,
		end: `${year}-03-05T18:00:00.000Z`,
	},
]

const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId: string
}) => {
	const { currentDate, timezone, view } = useIlamyCalendarContext()
	const parsed = parseDate(currentDate, timezone)
	return (
		<>
			<div data-testid={`${testId}-year`}>{parsed?.year}</div>
			<div data-testid={`${testId}-month`}>{parsed?.month}</div>
			<div data-testid={`${testId}-date`}>{parsed?.day}</div>
			<div data-testid={`${testId}-view`}>{view}</div>
			{children}
		</>
	)
}

const renderYearView = (props: Record<string, unknown> = {}) =>
	render(
		<CalendarTestProvider
			dayMaxEvents={3}
			events={[]}
			firstDayOfWeek={0}
			locale="en"
			plugins={[yearPlugin()]}
			timezone="UTC"
			{...props}
		>
			<TestWrapper testId="ctx">
				<YearView />
			</TestWrapper>
		</CalendarTestProvider>
	)

describe('yearPlugin', () => {
	beforeEach(() => {
		cleanup()
	})

	test('registers the year view via plugin contract', () => {
		const plugin = yearPlugin()
		expect(plugin.name).toBe('year')
		expect(plugin.views).toHaveLength(1)
		expect(plugin.views?.at(0)?.name).toBe('year')
		expect(plugin.views?.at(0)?.supportsResources).toBe(false)
	})

	test('aligns mini-calendar day cells with firstDayOfWeek headers', () => {
		renderYearView({
			firstDayOfWeek: 1,
			initialDate: '2025-06-15T00:00:00.000Z',
		})

		expect(
			screen.getByTestId('year-day-2025-06-2025-05-26')
		).toBeInTheDocument()
		expect(
			screen.getByTestId('year-day-2025-06-2025-07-06')
		).toBeInTheDocument()
		expect(
			screen.queryByTestId('year-day-2025-06-2025-07-07')
		).not.toBeInTheDocument()
	})

	test('renders all 12 months with titles and weekday headers', () => {
		renderYearView({ initialDate: '2025-01-15T00:00:00.000Z' })
		expect(screen.getByTestId('year-view')).toBeInTheDocument()
		expect(screen.getByTestId('year-grid')).toBeInTheDocument()

		monthNames.forEach((name, i) => {
			const monthId = String(i + 1).padStart(2, '0')
			expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
			expect(
				screen.getByTestId(`year-month-title-${monthId}`)
			).toHaveTextContent(name)
		})
		expect(screen.getAllByText('Su')).toHaveLength(12)
	})

	test('displays accurate event count badges and caps dots at 3', () => {
		const events = createTestEvents(2025)
		renderYearView({ events, initialDate: '2025-01-15T00:00:00.000Z' })

		expect(screen.getByTestId('year-month-count-01')).toHaveTextContent(
			'6 Events'
		)
		expect(screen.getByTestId('year-month-count-02')).toHaveTextContent(
			'1 Event'
		)
		expect(screen.getByTestId('year-month-count-03')).toHaveTextContent(
			'5 Events'
		)
		expect(screen.queryByTestId('year-month-count-04')).not.toBeInTheDocument()

		const mar5 = screen.getByTestId('year-day-2025-03-2025-03-05')
		expect(mar5.querySelectorAll('.rounded-full.h-\\[3px\\]')).toHaveLength(3)
		expect(mar5).toHaveAttribute('title', '5 Events')
	})

	test('counts a multi-day event spanning a month boundary in both month badges', () => {
		const spanningEvent: CalendarEvent = {
			id: 'span-1',
			title: 'Spans Jan/Feb',
			start: '2025-01-30T18:00:00.000Z',
			end: '2025-02-02T10:00:00.000Z',
		}
		renderYearView({
			events: [spanningEvent],
			initialDate: '2025-01-15T00:00:00.000Z',
		})

		expect(screen.getByTestId('year-month-count-01')).toHaveTextContent(
			'1 Event'
		)
		expect(screen.getByTestId('year-month-count-02')).toHaveTextContent(
			'1 Event'
		)
	})

	test('clicking month title and day cell emits single atomic onDateChange (#231)', () => {
		const calls: Array<{ date: IsoDateString; range: DateRange }> = []
		renderYearView({
			initialDate: '2025-01-15T00:00:00.000Z',
			onDateChange: (date: IsoDateString, range: DateRange) =>
				calls.push({ date, range }),
		})

		fireEvent.click(screen.getByTestId('year-day-2025-03-2025-03-10'))
		expect(calls).toHaveLength(1)
		expect(calls.at(0)?.date.slice(0, 10)).toBe('2025-03-10')
		expect(calls.at(0)?.range.start.slice(0, 10)).toBe('2025-03-10')
		expect(calls.at(0)?.range.end.slice(0, 10)).toBe('2025-03-10')
		expect(screen.getByTestId('ctx-view')).toHaveTextContent('day')

		fireEvent.click(screen.getByTestId('year-month-title-03'))
		expect(calls).toHaveLength(2)
		expect(calls.at(1)?.date.slice(0, 10)).toBe('2025-03-01')
		expect(calls.at(1)?.range.start.slice(0, 10)).toBe('2025-02-23')
		expect(calls.at(1)?.range.end.slice(0, 10)).toBe('2025-04-05')
		expect(screen.getByTestId('ctx-view')).toHaveTextContent('month')
	})

	test('issues constant query count regardless of event count (#245)', () => {
		let queryCount = 0
		const countingPlugin: IlamyPlugin = {
			name: 'query-counter',
			transformEvents: (events) => {
				queryCount += 1
				return events
			},
		}
		renderYearView({
			events: createTestEvents(2025),
			initialDate: '2025-01-15T00:00:00.000Z',
			plugins: [yearPlugin(), countingPlugin],
		})
		expect(queryCount).toBe(2)
	})
})

describe('YearView today highlight', () => {
	beforeEach(() => {
		cleanup()
	})

	afterEach(() => {
		setSystemTime()
	})

	test('follows the clock across midnight without a prop change', () => {
		setSystemTime(new Date('2025-06-15T23:59:00.000Z'))

		const tree = () => (
			<CalendarTestProvider
				dayMaxEvents={3}
				events={[]}
				firstDayOfWeek={0}
				initialDate="2025-06-15T12:00:00.000Z"
				locale="en"
				plugins={[yearPlugin()]}
				timezone="UTC"
			>
				<YearView />
			</CalendarTestProvider>
		)
		const { rerender } = render(tree())
		expect(
			screen.getByTestId('year-day-2025-06-2025-06-15').className
		).toContain('bg-primary')

		setSystemTime(new Date('2025-06-16T00:01:00.000Z'))
		rerender(tree())

		expect(
			screen.getByTestId('year-day-2025-06-2025-06-16').className
		).toContain('bg-primary')
		expect(
			screen.getByTestId('year-day-2025-06-2025-06-15').className
		).not.toContain('bg-primary')
	})
})

describe('YearView day click across the 2025 clock changes', () => {
	beforeEach(() => {
		cleanup()
	})

	const clockChanges = [
		{ zone: 'America/New_York', changeDay: '2025-03-09' },
		{ zone: 'America/New_York', changeDay: '2025-11-02' },
		{ zone: 'Europe/London', changeDay: '2025-03-30' },
		{ zone: 'Europe/London', changeDay: '2025-10-26' },
		{ zone: 'Australia/Sydney', changeDay: '2025-04-06' },
		{ zone: 'Australia/Sydney', changeDay: '2025-10-05' },
	]

	for (const { zone, changeDay } of clockChanges) {
		test(`every day within three of ${changeDay} in ${zone} is handed over at its own midnight`, () => {
			const handedOver: string[] = []
			const expected: string[] = []
			const anchor = parseDate(`${changeDay}T12:00:00`, zone)
			if (!anchor) {
				throw new Error(`Invalid anchor: ${changeDay}`)
			}
			render(
				<CalendarTestProvider
					dayMaxEvents={3}
					events={[]}
					firstDayOfWeek={0}
					initialDate={toOffsetIso(anchor)}
					locale="en"
					onDateChange={(dateIso) => {
						const parsed = parseDate(dateIso, zone)
						handedOver.push(parsed ? toUtcIso(parsed) : dateIso)
					}}
					plugins={[yearPlugin()]}
					timezone={zone}
				>
					<YearView />
				</CalendarTestProvider>
			)
			for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
				const targetDay = add(anchor, offset, 'day')
				const key = dayKey(targetDay)
				const monthKey = key.slice(0, 7)
				const expectedMidnight = parseDate(`${key}T00:00:00`, zone)
				if (!expectedMidnight) {
					throw new Error(`Invalid midnight: ${key}`)
				}
				expected.push(toUtcIso(expectedMidnight))
				fireEvent.click(screen.getByTestId(`year-day-${monthKey}-${key}`))
			}
			expect(handedOver).toEqual(expected)
		})
	}

	test('defaults to current year when no initialDate is passed', () => {
		renderYearView()
		expect(screen.getByTestId('ctx-year')).toHaveTextContent(
			String(now('UTC').year)
		)
	})
})
