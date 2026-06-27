import { describe, expect, it, mock } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
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
})
