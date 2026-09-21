import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/contexts/drag-preview-context'
import { CalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import type { RenderCurrentTimeIndicatorProps } from '@/features/calendar/types'
import { keys } from '@/lib/utils/keys'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import type { CalendarView } from '@/types'
import { VerticalGridEventsLayer } from './vertical-grid-events-layer'

/**
 * Shared custom render implementation for tests.
 */
const TEST_CUSTOM_RENDER = ({ resource }: RenderCurrentTimeIndicatorProps) => (
	<div data-testid="custom-indicator">
		<span data-testid="resource-id">{resource?.id || 'none'}</span>
	</div>
)

// Mutable test configuration - can be changed per test
let customRenderFn:
	| ((props: RenderCurrentTimeIndicatorProps) => React.ReactNode)
	| undefined

// Test wrapper using CalendarContext.Provider directly
const TestWrapper: React.FC<{
	children: React.ReactNode
	view?: CalendarView
	preview?: DragPreviewState
}> = ({ children, view = 'day', preview }) => (
	<CalendarContext.Provider
		value={
			{
				renderCurrentTimeIndicator: customRenderFn,
				events: [],
				getEventsForDateRange: () => [],
				timeFormat: '12-hour',
				view,
			} as never
		}
	>
		<DragPreviewContext.Provider value={preview ?? null}>
			{children}
		</DragPreviewContext.Provider>
	</CalendarContext.Provider>
)

const renderEventsLayer = ({
	preview,
	...props
}: {
	days: Dayjs[]
	resource?: Resource
	view?: CalendarView
	gridType?: 'day' | 'hour'
	'data-testid'?: string
	preview?: DragPreviewState
}) => {
	return render(
		<TestWrapper preview={preview} view={props.view}>
			<VerticalGridEventsLayer {...props} />
		</TestWrapper>
	)
}

describe('VerticalGridEventsLayer', () => {
	beforeEach(() => {
		customRenderFn = undefined
		cleanup()
	})

	test('renders current time indicator when current time is within range', () => {
		const now = dayjs()
		const rangeStart = now.startOf('hour')
		const hours = [rangeStart]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
	})

	test('renders the indicator in hour-resolution grids', () => {
		const now = dayjs()
		const rangeStart = now.startOf('hour')

		renderEventsLayer({
			days: [rangeStart],
			gridType: 'hour',
			'data-testid': 'events-layer',
		})

		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
	})

	test('does not render the indicator in day-resolution grids (issue #123)', () => {
		// Day-resolution vertical views (resource month, resource week daily) span
		// whole days, so a sub-day "now" line is meaningless and should be hidden,
		// even though the current day is within range.
		const today = dayjs().startOf('day')

		renderEventsLayer({
			days: [today],
			gridType: 'day',
			'data-testid': 'events-layer',
		})

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('does not render current time indicator when current time is outside range', () => {
		const futureDate = dayjs('2099-01-01T10:00:00.000Z')
		const hours = [futureDate]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('uses custom renderCurrentTimeIndicator from context', () => {
		customRenderFn = TEST_CUSTOM_RENDER

		const now = dayjs()
		const rangeStart = now.startOf('hour')
		const hours = [rangeStart]
		const resource = { id: 'res-2', title: 'Resource 2' }

		renderEventsLayer({
			days: hours,
			resource,
			'data-testid': 'events-layer',
		})

		expect(screen.getByTestId('custom-indicator')).toBeInTheDocument()
		expect(screen.getByTestId('resource-id')).toHaveTextContent('res-2')
		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('passes resource to CurrentTimeIndicator', () => {
		let receivedResource: Resource | undefined

		customRenderFn = (props) => {
			receivedResource = props.resource
			return TEST_CUSTOM_RENDER(props)
		}

		const now = dayjs()
		const rangeStart = now.startOf('hour')
		const hours = [rangeStart]
		const resource = { id: 'res-5', title: 'Resource 5' }

		renderEventsLayer({
			days: hours,
			resource,
			'data-testid': 'events-layer',
		})

		expect(receivedResource).toEqual(resource)
	})

	test('resource defaults to undefined', () => {
		let receivedResource: Resource | undefined

		customRenderFn = (props) => {
			receivedResource = props.resource
			return TEST_CUSTOM_RENDER(props)
		}

		const now = dayjs()
		const rangeStart = now.startOf('hour')
		const hours = [rangeStart]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(receivedResource).toBeUndefined()
	})

	test('renders the snapped mirror when the candidate overlaps the column', () => {
		const day = dayjs('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => day.add(i, 'hour'))
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Dragging Meeting',
				start: day.hour(10),
				end: day.hour(12),
			},
			start: day.hour(10),
			end: day.hour(12),
			allDay: false,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		expect(screen.getByTestId(keys.dragPreview('vertical'))).toBeInTheDocument()
		expect(screen.getByText('Dragging Meeting')).toBeInTheDocument()
		expect(screen.getByText(/10:00am/)).toBeInTheDocument()
		expect(screen.getByText(/12:00pm/)).toBeInTheDocument()
	})

	test('draws the mirror opaque, as the strongest surface in the grid', () => {
		// FullCalendar puts no opacity rule on `.fc-event-mirror` at all; only the
		// bar left behind is dimmed. A translucent mirror inverts the hierarchy —
		// the thing being moved ends up fainter than the grid it crosses, which is
		// how it became impossible to tell what was being dragged.
		const day = dayjs('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => day.add(i, 'hour'))
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Dragging Meeting',
				start: day.hour(10),
				end: day.hour(12),
			},
			start: day.hour(10),
			end: day.hour(12),
			allDay: false,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		const mirror = screen.getByTestId(keys.dragPreview('vertical'))

		expect(mirror.className).not.toContain('opacity-')
		// Inset, so the layer's `overflow-clip` cannot shave it off.
		expect(mirror.className.split(/\s+/)).toContain('inset-ring-2')
	})

	test('draws no mirror for an all-day candidate, which this grid never shows', () => {
		const day = dayjs('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => day.add(i, 'hour'))
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Company Offsite',
				start: day.startOf('day'),
				end: day.add(1, 'day').startOf('day'),
				allDay: true,
			},
			start: day.startOf('day'),
			end: day.add(1, 'day').startOf('day'),
			allDay: true,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		expect(
			screen.queryByTestId(keys.dragPreview('vertical'))
		).not.toBeInTheDocument()
	})
})
