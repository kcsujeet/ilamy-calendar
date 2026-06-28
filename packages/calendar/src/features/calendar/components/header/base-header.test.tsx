import { describe, expect, it, mock } from 'bun:test'
import { agendaPlugin } from '@ilamy/calendar-agenda'
import type { CalendarEvent, IlamyPlugin, PluginView } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { Header } from './base-header'

// Custom render function that wraps Header in CalendarProvider. The header tier
// defaults to 'desktop' in tests (no layout for ResizeObserver to measure), so
// these exercise the desktop layout: segmented switcher + inline Export button.
const renderHeader = (events: CalendarEvent[] = [], providerProps = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={events}
			firstDayOfWeek={0}
			{...providerProps}
		>
			<Header />
		</CalendarProvider>
	)
}

const mockDownloadICalendar = mock()

mock.module('@/lib/utils/export-ical', () => ({
	downloadICalendar: mockDownloadICalendar,
}))

describe('Calendar header', () => {
	const testEvents: CalendarEvent[] = [
		{
			id: 'test-1',
			title: 'Test Event',
			start: dayjs('2025-08-04T09:00:00.000Z'),
			end: dayjs('2025-08-04T10:00:00.000Z'),
			uid: 'test-1@ilamy.calendar',
		},
		{
			id: 'test-2',
			title: 'Another Event',
			start: dayjs('2025-08-05T14:00:00.000Z'),
			end: dayjs('2025-08-05T15:00:00.000Z'),
			description: 'Test description',
		},
	]

	it('should render the export button', () => {
		renderHeader(testEvents)

		const exportButton = screen.getByRole('button', { name: /export/i })
		expect(exportButton).toBeInTheDocument()
		expect(exportButton).toHaveTextContent('Export')
	})

	it('should call downloadICalendar when export is clicked', () => {
		renderHeader(testEvents)

		fireEvent.click(screen.getByRole('button', { name: /export/i }))

		expect(mockDownloadICalendar).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ id: 'test-1', title: 'Test Event' }),
				expect.objectContaining({ id: 'test-2', title: 'Another Event' }),
			]),
			expect.any(Function),
			expect.stringMatching(/calendar-\d{4}-\d{2}-\d{2}\.ics/),
			'ilamy Calendar'
		)
	})

	it('should not render the export button when hideExportButton is true', () => {
		renderHeader(testEvents, { hideExportButton: true })

		expect(
			screen.queryByRole('button', { name: /export/i })
		).not.toBeInTheDocument()
	})

	it('should call onDateChange when picking a month from the title date picker', async () => {
		const onDateChange = mock()

		renderHeader([], {
			initialDate: dayjs('2025-08-04T09:00:00.000Z'),
			onDateChange,
		})

		// Title shows "August 2025" in month view; clicking it opens the month grid.
		await act(async () => {
			fireEvent.click(screen.getByTestId('calendar-title'))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Sep' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})

		const calledDate = onDateChange.mock.calls[0][0]
		expect(dayjs.isDayjs(calledDate)).toBe(true)
		expect(calledDate.month()).toBe(8)
		expect(calledDate.year()).toBe(2025)
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
			initialDate: dayjs('2026-04-29T12:00:00.000Z'),
		})

		// firstDayOfWeek defaults to 0 (Sunday), so the week containing Apr 29 2026
		// is Sun Apr 26 - Sat May 2. formatRange returns "Apr 26 – May 2" in English
		// (en-dash separator, U+2013) with no year suffix.
		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 26 – May 2')
		expect(title.textContent).not.toContain('2026')
	})

	it('renders a custom-window agenda range (not a single day) in the title', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: dayjs('2026-04-15T12:00:00.000Z'),
			plugins: [agendaPlugin({ window: 7 })],
		})

		// A custom 7-day window starting at Apr 15 lists Apr 15 - 21, so the title
		// shows that range rather than just "Apr 15".
		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 15 – 21')
	})

	it('mirrors the week-view title for a week-window agenda', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: dayjs('2026-04-15T12:00:00.000Z'),
			plugins: [agendaPlugin({ window: 'week' })],
		})

		// firstDayOfWeek 0: the week containing Apr 15 2026 (a Wednesday) is
		// Sun Apr 12 - Sat Apr 18, exactly as week view would title it.
		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 12 – 18')
	})

	it('mirrors the month-view title for a month-window agenda', () => {
		renderHeader([], {
			initialView: 'agenda',
			initialDate: dayjs('2026-04-15T12:00:00.000Z'),
			plugins: [agendaPlugin({ window: 'month' })],
		})

		const title = screen.getByTestId('calendar-title')
		expect(title).toHaveTextContent('Apr 2026')
	})
})

// The header date picker must derive its title + picker form generically from a
// view's navigation metadata, never from the view's name. These exercise a
// throwaway third-party view (named 'sprint', not 'agenda') to prove core stays
// plugin-agnostic: the same nav step that drives prev/next also picks the picker.
describe('header date picker (plugin-agnostic)', () => {
	// Apr 15 2026 is a Wednesday; firstDayOfWeek defaults to 0 (Sunday), so its
	// week is Sun Apr 12 - Sat Apr 18.
	const at = dayjs('2026-04-15T12:00:00.000Z')

	const StubIcon = () => null

	// A one-view plugin with arbitrary navigation metadata and an optional range.
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
			range: (date) => ({ start: date, end: date.add(2, 'day') }),
		})
		// A 3-day window Apr 15 - 17: not a single day, not a grid week.
		expect(titleText()).toContain('Apr 15 – 17')
	})

	it('treats navigationStep as winning over navigationUnit', () => {
		// A view that labels itself week but steps a 10-day window is a range.
		renderSprint({
			navigationUnit: 'week',
			navigationStep: { amount: 10, unit: 'day' },
			range: (date) => ({ start: date, end: date.add(9, 'day') }),
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
		// The month grid shows month buttons; the day calendar would not.
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Sep' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})
		expect(onDateChange.mock.calls[0][0].month()).toBe(8)
	})

	it('opens the year grid for a year-navigating view', async () => {
		const onDateChange = mock()
		renderSprint({ navigationUnit: 'year' }, { onDateChange })

		await act(async () => {
			fireEvent.click(screen.getByTestId('calendar-title'))
		})
		// The year grid lists selectable years; pick the next one.
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '2027' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})
		expect(onDateChange.mock.calls[0][0].year()).toBe(2027)
	})
})
