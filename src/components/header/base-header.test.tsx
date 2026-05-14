import { describe, expect, it, mock } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import Header from './base-header'

// Custom render function that wraps Header in CalendarProvider
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

describe('Header with Export Button', () => {
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

	it('should render export button on desktop', () => {
		renderHeader(testEvents)

		const exportButton = screen.getByRole('button', { name: /export/i })
		expect(exportButton).toBeInTheDocument()
		expect(exportButton).toHaveTextContent('Export')
	})

	it('should render export button in mobile menu', () => {
		renderHeader(testEvents)

		// Open mobile menu - find the menu button by its icon
		const menuButtons = screen.getAllByRole('button', { name: '' })
		const actualMenuButton = menuButtons.find((button) =>
			button.querySelector('svg.lucide-menu')
		)

		if (!actualMenuButton) {
			throw new Error('Menu button not found')
		}

		fireEvent.click(actualMenuButton)

		// Check for export button in mobile menu
		const mobileExportButton = screen.getByRole('button', {
			name: /export calendar/i,
		})
		expect(mobileExportButton).toBeInTheDocument()
		expect(mobileExportButton).toHaveTextContent('Export Calendar (.ics)')
	})

	it('should call downloadICalendar when export button is clicked', () => {
		renderHeader(testEvents)

		const exportButton = screen.getByRole('button', { name: /export/i })
		fireEvent.click(exportButton)

		expect(mockDownloadICalendar).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'test-1',
					title: 'Test Event',
				}),
				expect.objectContaining({
					id: 'test-2',
					title: 'Another Event',
				}),
			]),
			expect.stringMatching(/calendar-\d{4}-\d{2}-\d{2}\.ics/),
			'ilamy Calendar'
		)
	})

	it('should call onDateChange when selecting a month from the built-in header dropdown', async () => {
		const onDateChange = mock()
		const translator = (key: string) => {
			const dict: Record<string, string> = {
				august: 'August',
				september: 'September',
			}
			return dict[key] ?? key
		}

		renderHeader([], {
			initialDate: dayjs('2025-08-04T09:00:00.000Z'),
			onDateChange,
			translator,
		})

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'August' }))
		})

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'September' }))
		})

		await waitFor(() => {
			expect(onDateChange).toHaveBeenCalledTimes(1)
		})

		const calledDate = onDateChange.mock.calls[0][0]
		expect(dayjs.isDayjs(calledDate)).toBe(true)
		expect(calledDate.month()).toBe(8)
		expect(calledDate.year()).toBe(2025)
	})

	it('should render day view title with translated weekday and numeric day', () => {
		const translator = (key: string) => {
			const dict: Record<string, string> = {
				monday: 'Lundi',
			}
			return dict[key] ?? key
		}

		renderHeader([], {
			initialDate: dayjs('2025-05-05T09:00:00.000Z'),
			initialView: 'day',
			locale: 'fr',
			translator,
		})

		expect(
			screen.getByRole('button', { name: /Lundi,\s*5/i })
		).toBeInTheDocument()
	})
})
