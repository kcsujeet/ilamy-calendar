import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { agendaPlugin } from '@ilamy/calendar-agenda'
import { yearPlugin } from '@ilamy/calendar-year'
import type { CalendarEvent, IlamyPlugin, PluginView } from '@ilamy/types'
import { add, parseDate, toOffsetIso } from '@ilamy/utils/temporal'
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { SLOT_TOOLBAR } from '@/features/calendar/components/calendar-slots'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { plainSpaces } from '@/testing/plain-spaces'
import { Header } from './base-header'

const renderHeader = (events: CalendarEvent[] = [], providerProps = {}) => {
	cleanup()
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={events}
			firstDayOfWeek={0}
			timezone="UTC"
			{...providerProps}
		>
			<Header />
		</CalendarProvider>
	)
}

describe('Calendar header', () => {
	beforeEach(() => {
		cleanup()
	})

	const testEvents: CalendarEvent[] = [
		{
			id: 'test-1',
			title: 'Test Event',
			start: '2025-08-04T09:00:00+00:00',
			end: '2025-08-04T10:00:00+00:00',
			uid: 'test-1@ilamy.calendar',
		},
		{
			id: 'test-2',
			title: 'Another Event',
			start: '2025-08-05T14:00:00+00:00',
			end: '2025-08-05T15:00:00+00:00',
			description: 'Test description',
		},
	]

	it('does not render an export button without icalPlugin (D7)', () => {
		renderHeader(testEvents)

		expect(
			screen.queryByRole('button', { name: /export/i })
		).not.toBeInTheDocument()
	})

	it('renders plugin-contributed toolbar actions via SLOT_TOOLBAR (D7)', () => {
		const onExport = mock(() => {})
		const toolbarPlugin: IlamyPlugin = {
			name: 'test-toolbar-action',
			renderSlot: (slotName) => {
				if (slotName !== SLOT_TOOLBAR) {
					return null
				}
				return (
					<button onClick={onExport} type="button">
						Export
					</button>
				)
			},
		}
		renderHeader(testEvents, { plugins: [toolbarPlugin] })

		const exportButton = screen.getByRole('button', { name: /export/i })
		expect(exportButton).toBeInTheDocument()
		fireEvent.click(exportButton)
		expect(onExport).toHaveBeenCalledTimes(1)
	})

	it('should call onDateChange with an ISO string when picking a month from the title date picker', async () => {
		const onDateChange = mock()

		renderHeader([], {
			initialDate: '2025-08-04T09:00:00Z',
			onDateChange,
		})

		await act(async () => {
			fireEvent.click(screen.getByTestId('calendar-title'))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Sep' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})

		const calledDate = onDateChange.mock.calls.at(0)?.at(0) as string
		expect(typeof calledDate).toBe('string')
		const parsed = parseDate(calledDate, 'UTC')
		expect(parsed?.month).toBe(9)
		expect(parsed?.year).toBe(2025)
	})

	it('should switch the active view from the segmented switcher', async () => {
		renderHeader()

		const weekToggle = screen.getByRole('radio', { name: 'Week' })
		await act(async () => {
			fireEvent.click(weekToggle)
		})

		await waitFor(() => {
			expect(weekToggle).toHaveAttribute('aria-checked', 'true')
		})
	})

	it('renders the week range in the title using Intl.DateTimeFormat.formatRange', () => {
		renderHeader([], {
			initialView: 'week',
			initialDate: '2026-04-29T12:00:00Z',
		})

		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 26 – May 2')
		expect(title.textContent).not.toContain('2026')
	})

	it('renders a custom-window agenda range (not a single day) in the title', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: '2026-04-15T12:00:00Z',
			plugins: [agendaPlugin({ window: 7 })],
		})

		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 15 – 21')
	})

	it('mirrors the week-view title for a week-window agenda', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: '2026-04-15T12:00:00Z',
			plugins: [agendaPlugin({ window: 'week' })],
		})

		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 12 – 18')
	})

	const hiddenWeekDays = new Set([3, 6, 0])

	it('titles a week-window agenda with every day it lists, hidden days included', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: '2026-04-15T12:00:00Z',
			plugins: [agendaPlugin({ window: 'week' })],
			hiddenDays: hiddenWeekDays,
		})

		expect(screen.getByTestId('calendar-title')).toHaveTextContent(
			'Apr 12 – 18'
		)
	})

	it('titles the week view with only the days it draws', () => {
		renderHeader([], {
			initialView: 'week',
			initialDate: '2026-04-15T12:00:00Z',
			hiddenDays: hiddenWeekDays,
		})

		expect(screen.getByTestId('calendar-title')).toHaveTextContent(
			'Apr 13 – 17'
		)
	})

	it('mirrors the month-view title for a month-window agenda', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: '2026-04-15T12:00:00Z',
			plugins: [agendaPlugin({ window: 'month' })],
		})

		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 2026')
	})
})

describe('titleFormat', () => {
	const aprilFifteenth = '2026-04-15T12:00:00Z'
	const renderTitled = (providerProps: Record<string, unknown>) => {
		renderHeader([], {
			initialDate: aprilFifteenth,
			timezone: 'UTC',
			plugins: [yearPlugin()],
			...providerProps,
		})
		return screen.getByTestId('calendar-title').textContent
	}

	it('formats the year view title', () => {
		expect(
			renderTitled({ initialView: 'year', titleFormat: { year: '2-digit' } })
		).toBe('26')
	})

	it('formats the month view title', () => {
		expect(
			renderTitled({
				initialView: 'month',
				titleFormat: { month: 'long', year: 'numeric' },
			})
		).toBe('April 2026')
	})

	it('formats the month view title as the month range', () => {
		const title = renderTitled({
			initialView: 'month',
			titleFormat: { month: 'short', day: 'numeric', year: 'numeric' },
		})
		expect(plainSpaces(title)).toBe('Apr 1 – 30, 2026')
	})

	it('formats the year view title as the year range', () => {
		const title = renderTitled({
			initialView: 'year',
			titleFormat: { month: 'long', year: 'numeric' },
		})
		expect(plainSpaces(title)).toBe('January – December 2026')
	})

	it('formats the day view title', () => {
		expect(
			renderTitled({
				initialView: 'day',
				titleFormat: { weekday: 'long', month: 'long', day: 'numeric' },
			})
		).toBe('Wednesday, April 15')
	})

	it('formats the week view title as a range', () => {
		const title = renderTitled({
			initialView: 'week',
			titleFormat: { month: 'long', day: 'numeric' },
		})
		expect(plainSpaces(title)).toBe('April 12 – 18')
	})

	it('formats a custom window title as a range', () => {
		const title = renderTitled({
			initialView: 'agenda',
			plugins: [agendaPlugin({ window: 7 })],
			titleFormat: { month: 'long', day: 'numeric' },
		})
		expect(plainSpaces(title)).toBe('April 15 – 21')
	})
})

describe('header date picker (plugin-agnostic)', () => {
	const at = '2026-04-15T12:00:00Z'

	const StubIcon = () => null

	const customViewPlugin = (
		view: Partial<PluginView> & Pick<PluginView, 'name'>
	): IlamyPlugin => ({
		name: `plugin-${view.name}`,
		views: [{ icon: StubIcon, component: () => null, ...view }],
	})

	const renderSprint = (view: Partial<PluginView>, providerProps = {}) =>
		renderHeader([], {
			initialView: 'sprint',
			initialDate: at,
			plugins: [customViewPlugin({ name: 'sprint', ...view })],
			...providerProps,
		})

	const titleText = () => screen.getByTestId('calendar-title').textContent ?? ''

	it('titles a week-navigating custom view as a week range', () => {
		renderSprint({ navigationUnit: 'week' })
		expect(titleText()).toContain('Apr 12 – 18')
	})

	it('titles a month-navigating custom view as MMM YYYY', () => {
		renderSprint({ navigationUnit: 'month' })
		expect(titleText()).toContain('Apr 2026')
	})

	it('titles a year-navigating custom view as YYYY', () => {
		renderSprint({ navigationUnit: 'year' })
		expect(titleText()).toContain('2026')
		expect(titleText()).not.toContain('Apr')
	})

	it('titles a single-day custom view as a single date with weekday', () => {
		renderSprint({ navigationUnit: 'day' })
		expect(titleText()).toContain('Wed, Apr 15, 2026')
	})

	it('titles a multi-day-window custom view as its range', () => {
		renderSprint({
			navigationStep: { amount: 3, unit: 'day' },
			range: (date) => {
				const d = parseDate(date, 'UTC')
				return {
					start: date,
					end: d ? toOffsetIso(add(d, 2, 'day')) : date,
				}
			},
		})
		expect(titleText()).toContain('Apr 15 – 17')
	})

	it('treats navigationStep as winning over navigationUnit', () => {
		renderSprint({
			navigationUnit: 'week',
			navigationStep: { amount: 10, unit: 'day' },
			range: (date) => {
				const d = parseDate(date, 'UTC')
				return {
					start: date,
					end: d ? toOffsetIso(add(d, 9, 'day')) : date,
				}
			},
		})
		expect(titleText()).toContain('Apr 15 – 24')
	})

	it('falls back to a single date when a view declares no navigation metadata', () => {
		renderSprint({})
		expect(titleText()).toContain('Wed, Apr 15, 2026')
	})

	it('opens the month grid (not the day calendar) for a month-navigating view', async () => {
		const onDateChange = mock()
		renderSprint({ navigationUnit: 'month' }, { onDateChange })

		await act(async () => {
			fireEvent.click(screen.getByTestId('calendar-title'))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Sep' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})
		const calledDate = onDateChange.mock.calls.at(0)?.at(0) as string
		expect(parseDate(calledDate, 'UTC')?.month).toBe(9)
	})

	it('opens the year grid for a year-navigating view', async () => {
		const onDateChange = mock()
		renderSprint({ navigationUnit: 'year' }, { onDateChange })

		await act(async () => {
			fireEvent.click(screen.getByTestId('calendar-title'))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '2027' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})
		const calledDate = onDateChange.mock.calls.at(0)?.at(0) as string
		expect(parseDate(calledDate, 'UTC')?.year).toBe(2027)
	})
})
