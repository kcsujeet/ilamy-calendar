import { beforeEach, describe, expect, test } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { VerticalGridCol } from './vertical-grid-col'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockDays = [initialDate.hour(9), initialDate.hour(10)]

const renderVerticalGridCol = (props = {}) => {
	const defaultProps = {
		id: 'test-col',
		day: initialDate,
		days: mockDays,
		gridType: 'hour' as const,
	}
	// Use CalendarProvider to ensure getEventsForResource is available
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
		>
			<VerticalGridCol {...defaultProps} {...props} />
		</CalendarProvider>
	)
}

describe('VerticalGridCol', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders with default id', () => {
		renderVerticalGridCol()
		expect(screen.getByTestId('vertical-col-test-col')).toBeInTheDocument()
	})

	test('renders custom testid if provided', () => {
		renderVerticalGridCol({ 'data-testid': 'custom-col-id' })
		expect(screen.getByTestId('custom-col-id')).toBeInTheDocument()
	})

	test('renders time labels when id is time-col', () => {
		renderVerticalGridCol({
			id: 'time-col',
			renderCell: (date: Dayjs) => <span>{date.format('HH:mm')}</span>,
		})

		expect(screen.getByTestId('vertical-time-09')).toHaveTextContent('09:00')
		expect(screen.getByTestId('vertical-time-10')).toHaveTextContent('10:00')
	})

	test('hour separators come from the grid gap, not per-cell borders', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol()
		// Approach G: the grid container draws the hour/column lines via the
		// gaps (gap-px) filled with the border color (bg-border). Cells carry no
		// per-cell separators.
		const cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		const gridContainer = cell.closest('div.grid')
		expect(gridContainer).not.toBeNull()
		const gridClasses = gridContainer?.className.split(' ') ?? []
		expect(gridClasses).toContain('gap-px')
		expect(gridClasses).toContain('bg-border')

		const cellClasses = cell.className.split(' ')
		expect(cellClasses).not.toContain('border-r')
		expect(cellClasses).not.toContain('border-r-0')
		expect(cellClasses).not.toContain('border-b')
		expect(cellClasses).not.toContain('border-b-0')
	})

	test('no day cell carries a per-cell separator regardless of position', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol()
		// mockDays = [09:00, 10:00]; with gap-based lines neither the first nor
		// the last row gets a per-cell border-r/border-b.
		const firstHour = screen
			.getByTestId(`vertical-cell-${dateStr}-09-00`)
			.className.split(' ')
		const lastHour = screen
			.getByTestId(`vertical-cell-${dateStr}-10-00`)
			.className.split(' ')
		expect(firstHour).not.toContain('border-b')
		expect(firstHour).not.toContain('border-r')
		expect(lastHour).not.toContain('border-b')
		expect(lastHour).not.toContain('border-r')
	})

	test('the gutter draws its right separator with a box-shadow, not border-r', () => {
		renderVerticalGridCol({
			id: 'time-col',
			className:
				'shadow-[1px_0_0_0_color-mix(in_oklch,var(--background),var(--foreground)_10%)]',
			renderCell: (date: Dayjs) => <span>{date.format('HH:mm')}</span>,
		})
		const gutter = screen.getByTestId('vertical-col-time-col')
		expect(gutter.className).toContain('shadow-[1px_0_0_0')
		expect(gutter.className.split(' ')).not.toContain('border-r')
	})

	test('renders cells with correct IDs', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol()

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		).toBeInTheDocument()
	})

	test('includes the resource id in cell IDs when a resource is provided', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({ resource: { id: 'res-1', title: 'Resource 1' } })

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-res-1`)
		).toBeInTheDocument()
	})

	test('renders minute slots when slotDurationMinutes is provided', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({
			slotDurationMinutes: 30,
		})

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-10-30`)
		).toBeInTheDocument()
	})

	test('groups quarter-hour cells under one hour wrapper that shares the row equally', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({
			slotDurationMinutes: 15,
		})

		const nineZero = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		const nineFifteen = screen.getByTestId(`vertical-cell-${dateStr}-09-15`)
		const nineThirty = screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
		const nineFortyFive = screen.getByTestId(`vertical-cell-${dateStr}-09-45`)

		// All 4 quarter-hour cells for 09:00 must share the same direct parent
		// so CSS Grid treats them as one row, not four scattered children.
		const wrapper = nineZero.parentElement
		expect(wrapper).not.toBeNull()
		expect(nineFifteen.parentElement).toBe(wrapper)
		expect(nineThirty.parentElement).toBe(wrapper)
		expect(nineFortyFive.parentElement).toBe(wrapper)

		// The wrapper must be a flex column so the 4 cells split the hour evenly.
		expect(wrapper?.className).toMatch(/\bflex-col\b/)

		// Each quarter-hour cell must use flex-1 (1/N share) and NOT a fixed
		// h-[15px] that would bunch cells at the bottom of taller rows.
		for (const cell of [nineZero, nineFifteen, nineThirty, nineFortyFive]) {
			expect(cell.className).toMatch(/\bflex-1\b/)
			expect(cell.className).not.toMatch(/\bh-\[15px\]\b/)
		}
	})

	test('daily cells (gridType="day") describe a full-day range, not a 1-hour slot', () => {
		// A daily-granularity vertical cell (resource month, week-daily) must span
		// the whole day like the horizontal grid does, so drag-to-create's
		// full-day-span region rule lets a selection cross days. Passing the hour
		// through made it a 00:00-01:00 slot and broke multi-day selection.
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({ gridType: 'day', days: [initialDate] })

		const cell = screen.getByTestId(`vertical-cell-${dateStr}-00-00`)
		const startISO = cell.getAttribute('data-start')
		const endISO = cell.getAttribute('data-end')
		expect(startISO).not.toBeNull()
		expect(endISO).not.toBeNull()
		expect(dayjs(endISO).diff(dayjs(startISO), 'hour')).toBe(23)
	})

	test('renders events layer by default', () => {
		renderVerticalGridCol()
		expect(screen.getByTestId('vertical-events-test-col')).toBeInTheDocument()
	})

	test('does not render events layer if noEvents is true', () => {
		renderVerticalGridCol({ noEvents: true })
		expect(
			screen.queryByTestId('vertical-events-test-col')
		).not.toBeInTheDocument()
	})
})
