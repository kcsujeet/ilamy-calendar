import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { VerticalGridCol } from './vertical-grid-col'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockDays = [initialDate.hour(9), initialDate.hour(10)]

const renderVerticalGridCol = (props = {}) => {
	const defaultProps = {
		id: 'test-col',
		day: initialDate,
		days: mockDays,
	}
	// Use ResourceCalendarProvider to ensure getEventsForResource is available
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
		>
			<VerticalGridCol {...defaultProps} {...props} />
		</ResourceCalendarProvider>
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

	test('includes resourceId in cell IDs if provided', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({ resourceId: 'res-1' })

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
