import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { DndContext, useDndContext } from '@dnd-kit/core'
import {
	elapsedDiff,
	parseDate,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/stores/drag-preview-context'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import type { CellInfo } from '@/types/calendar.types'
import { VerticalGridCol } from './vertical-grid-col'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const initialZoned = atUtc('2025-01-01T00:00:00.000Z')
const initialDate = '2025-01-01T00:00:00+00:00'
const mockDays = ['2025-01-01T09:00:00+00:00', '2025-01-01T10:00:00+00:00']
const dateStr = '2025-01-01'

const formatHHmm = (iso: string): string => {
	const d = atUtc(iso)
	return `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}`
}

const renderVerticalGridCol = (props = {}, providerProps = {}) => {
	const defaultProps = {
		id: 'test-col',
		day: initialDate,
		days: mockDays,
		gridType: 'hour' as const,
	}
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
			timezone="UTC"
			{...providerProps}
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
			renderCell: (date: string) => <span>{formatHHmm(date)}</span>,
		})

		expect(screen.getByTestId('vertical-time-09')).toHaveTextContent('09:00')
		expect(screen.getByTestId('vertical-time-10')).toHaveTextContent('10:00')
	})

	test('hour separators come from the grid gap, not per-cell borders', () => {
		renderVerticalGridCol()
		const cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		const gridContainer = cell.closest('div.grid')
		expect(gridContainer).not.toBeNull()
		const gridClasses = gridContainer?.className.split(' ') ?? []
		expect(gridClasses).toContain('gap-px')
		expect(gridClasses).toContain('bg-border')

		const getCellClasses = cell.className.split(' ')
		expect(getCellClasses).not.toContain('border-r')
		expect(getCellClasses).not.toContain('border-r-0')
		expect(getCellClasses).not.toContain('border-b')
		expect(getCellClasses).not.toContain('border-b-0')
	})

	test('no day cell carries a per-cell separator regardless of position', () => {
		renderVerticalGridCol()
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
			renderCell: (date: string) => <span>{formatHHmm(date)}</span>,
		})
		const gutter = screen.getByTestId('vertical-col-time-col')
		expect(gutter.className).toContain('shadow-[1px_0_0_0')
		expect(gutter.className.split(' ')).not.toContain('border-r')
	})

	test('renders cells with correct IDs', () => {
		renderVerticalGridCol()

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
		).toBeInTheDocument()
	})

	test('includes the resource id in cell IDs when a resource is provided', () => {
		renderVerticalGridCol({ resource: { id: 'res-1', title: 'Resource 1' } })

		expect(
			screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-res-1`)
		).toBeInTheDocument()
	})

	test('renders minute slots when slotDurationMinutes is provided', () => {
		renderVerticalGridCol({ slotDurationMinutes: 30 })

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
		renderVerticalGridCol({ slotDurationMinutes: 15 })

		const nineZero = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		const nineFifteen = screen.getByTestId(`vertical-cell-${dateStr}-09-15`)
		const nineThirty = screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
		const nineFortyFive = screen.getByTestId(`vertical-cell-${dateStr}-09-45`)

		const wrapper = nineZero.parentElement
		expect(wrapper).not.toBeNull()
		expect(nineFifteen.parentElement).toBe(wrapper)
		expect(nineThirty.parentElement).toBe(wrapper)
		expect(nineFortyFive.parentElement).toBe(wrapper)

		expect(wrapper?.className).toMatch(/\bflex-col\b/)

		for (const cell of [nineZero, nineFifteen, nineThirty, nineFortyFive]) {
			expect(cell.className).toMatch(/\bflex-1\b/)
			expect(cell.className).not.toMatch(/\bh-\[15px\]\b/)
		}
	})

	test('daily cells (gridType="day") describe a full-day range, not a 1-hour slot', () => {
		renderVerticalGridCol({ gridType: 'day', days: [initialDate] })

		const cell = screen.getByTestId(`vertical-cell-${dateStr}-00-00`)
		const startISO = cell.getAttribute('data-start')
		const endISO = cell.getAttribute('data-end')
		expect(startISO).not.toBeNull()
		expect(endISO).not.toBeNull()
		expect(
			elapsedDiff(atUtc(endISO ?? ''), atUtc(startISO ?? ''), 'hour')
		).toBe(24)
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

	test.each([
		[20, ['00', '20', '40']],
		[
			5,
			['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
		],
	])(
		'renders a %i-minute slot as one cell per slot in the hour',
		(slotDurationMinutes, minutes) => {
			renderVerticalGridCol({ slotDurationMinutes })

			for (const mm of minutes) {
				expect(
					screen.getByTestId(`vertical-cell-${dateStr}-09-${mm}`)
				).toBeInTheDocument()
			}
			expect(
				screen.queryByTestId(`vertical-cell-${dateStr}-09-01`)
			).not.toBeInTheDocument()
		}
	)

	test('tells each cell the axis time runs along and the size it snaps to', () => {
		renderVerticalGridCol({}, { snapDuration: 15 })

		const cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
		expect(cell).toHaveAttribute('data-time-axis', 'vertical')
		expect(cell).toHaveAttribute('data-snap-minutes', '15')
	})
})

describe('VerticalGridCol drop target', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderColumnInDnd = (slotDurationMinutes: number) => {
		let registered: ReturnType<
			ReturnType<typeof useDndContext>['droppableContainers']['toArray']
		> = []
		const ReadRegistry = () => {
			registered = useDndContext().droppableContainers.toArray()
			return null
		}
		render(
			<CalendarProvider
				events={[]}
				initialDate={initialDate}
				resources={[]}
				timezone="UTC"
			>
				<DndContext>
					<VerticalGridCol
						days={mockDays}
						gridType="hour"
						id="test-col"
						slotDurationMinutes={slotDurationMinutes}
					/>
					<ReadRegistry />
				</DndContext>
			</CalendarProvider>
		)
		return () => registered
	}

	test('registers one drop target for all of its slots', () => {
		const registered = renderColumnInDnd(15)
		expect(registered()).toHaveLength(1)
	})

	test('publishes every slot, in order, under that drop target', () => {
		const registered = renderColumnInDnd(30)

		const published = registered().at(0)?.data.current as {
			slots: Array<{
				data: { hour?: number; minute?: number }
				element: Element
			}>
		}
		expect(published.slots.map(({ data }) => [data.hour, data.minute])).toEqual(
			[
				[9, 0],
				[9, 30],
				[10, 0],
				[10, 30],
			]
		)
	})
})

describe('VerticalGridCol drag preview', () => {
	beforeEach(() => {
		cleanup()
	})

	const roomB = { id: 'room-b', title: 'room-b' }
	const resources = [roomB]
	const previewAt = (hour: number, resourceId?: string): DragPreviewState =>
		mkDragPreview({
			start: withTime(initialZoned, { hour }),
			end: withTime(initialZoned, { hour: hour + 1 }),
			resourceId,
		})

	const renderColumnUnderDrag = (initial: DragPreviewState | null) => {
		const getCellClassName = mock((_info: CellInfo) => '')
		const buildColumn = (dragPreview: DragPreviewState | null) => (
			<CalendarProvider
				events={[]}
				getCellClassName={getCellClassName}
				initialDate={initialDate}
				resources={resources}
				timezone="UTC"
			>
				<DragPreviewContext.Provider value={dragPreview}>
					<VerticalGridCol
						days={mockDays}
						gridType="hour"
						id="col"
						resource={roomB}
						slotDurationMinutes={30}
					/>
				</DragPreviewContext.Provider>
			</CalendarProvider>
		)
		const view = render(buildColumn(initial))
		const dragTo = (dragPreview: DragPreviewState | null) =>
			view.rerender(buildColumn(dragPreview))
		return { getCellClassName, dragTo }
	}

	const tintedTestIds = () =>
		screen
			.getAllByTestId(new RegExp(`^vertical-cell-${dateStr}-`))
			.filter((cell) => cell.hasAttribute('data-drop-target'))
			.map((cell) => cell.getAttribute('data-testid'))

	test('tints the slots a drag lands on, and only those', () => {
		renderColumnUnderDrag(previewAt(9, 'room-b'))

		expect(tintedTestIds()).toEqual([
			`vertical-cell-${dateStr}-09-00-resource-room-b`,
			`vertical-cell-${dateStr}-09-30-resource-room-b`,
		])
	})

	test('tints nothing when the drag lands on another resource', () => {
		renderColumnUnderDrag(previewAt(9, 'room-a'))

		expect(tintedTestIds()).toEqual([])
	})

	test('does not re-render its slots when the drag moves elsewhere', () => {
		const { getCellClassName, dragTo } = renderColumnUnderDrag(
			previewAt(9, 'room-a')
		)
		const callsBefore = getCellClassName.mock.calls.length

		dragTo(previewAt(10, 'room-a'))

		expect(getCellClassName.mock.calls.length).toBe(callsBefore)
	})

	test('re-renders its slots when the drag lands on it', () => {
		const { getCellClassName, dragTo } = renderColumnUnderDrag(null)
		const callsBefore = getCellClassName.mock.calls.length

		dragTo(previewAt(9, 'room-b'))

		expect(getCellClassName.mock.calls.length).toBeGreaterThan(callsBefore)
	})
})
