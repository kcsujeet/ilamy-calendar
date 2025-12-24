import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
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
			renderCell: (date: dayjs.Dayjs) => <span>{date.format('HH:mm')}</span>,
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
			screen.getByTestId(`vertical-cell-${dateStr}-09-00-res-1`)
		).toBeInTheDocument()
	})

	test('renders minute slots when cellSlots is provided', () => {
		const dateStr = initialDate.format('YYYY-MM-DD')
		renderVerticalGridCol({
			cellSlots: [0, 30],
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
