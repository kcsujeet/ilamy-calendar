import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import Header from './base-header'

// Custom render function that wraps Header in CalendarProvider
const renderHeader = (events: CalendarEvent[] = [], providerProps = {}) => {
	return render(
		<CalendarProvider
			events={events}
			dayMaxEvents={3}
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
})
