import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import {
	add,
	now,
	parseDate,
	startOf,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { CalendarContext } from '@/features/calendar/stores/calendar-context/calendar-context'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/features/calendar/stores/drag-preview-context'
import type { RenderCurrentTimeIndicatorProps } from '@/features/calendar/types'
import { keys } from '@/features/calendar/utils/keys'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import type { CalendarView } from '@/types'
import { VerticalGridEventsLayer } from './vertical-grid-events-layer'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const TEST_CUSTOM_RENDER = ({ resource }: RenderCurrentTimeIndicatorProps) => (
	<div data-testid="custom-indicator">
		<span data-testid="resource-id">{resource?.id || 'none'}</span>
	</div>
)

let customRenderFn:
	| ((props: RenderCurrentTimeIndicatorProps) => React.ReactNode)
	| undefined
let nowIndicator = true

const TestWrapper: React.FC<{
	children: React.ReactNode
	view?: CalendarView
	preview?: DragPreviewState
	resources?: Resource[]
}> = ({ children, view = 'day', preview, resources }) => (
	<CalendarContext.Provider
		value={
			{
				renderCurrentTimeIndicator: customRenderFn,
				nowIndicator,
				events: [],
				getEventsForDateRange: () => [],
				timeFormat: '12-hour',
				timezone: 'UTC',
				view,
				resources,
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
	resources,
	...props
}: {
	days: ZonedDate[]
	resource?: Resource
	resourceId?: string | number
	resources?: Resource[]
	view?: CalendarView
	gridType?: 'day' | 'hour'
	'data-testid'?: string
	preview?: DragPreviewState
}) => {
	return render(
		<TestWrapper preview={preview} resources={resources} view={props.view}>
			<VerticalGridEventsLayer {...props} />
		</TestWrapper>
	)
}

describe('VerticalGridEventsLayer', () => {
	beforeEach(() => {
		customRenderFn = undefined
		nowIndicator = true
		cleanup()
	})

	test('renders current time indicator when current time is within range', () => {
		const rangeStart = startOf(now('UTC'), 'hour')
		const hours = [rangeStart]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
	})

	test('renders the indicator in hour-resolution grids', () => {
		const rangeStart = startOf(now('UTC'), 'hour')

		renderEventsLayer({
			days: [rangeStart],
			gridType: 'hour',
			'data-testid': 'events-layer',
		})

		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
	})

	test('draws the dot only for the first resource, even when another has id 0', () => {
		const days = [startOf(now('UTC'), 'hour')]
		const resources = [
			{ id: 1, title: 'Room One' },
			{ id: 0, title: 'Room Zero' },
		]

		renderEventsLayer({ days, resources, resourceId: 0 })
		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
		expect(screen.queryByTestId('current-time-dot')).not.toBeInTheDocument()

		cleanup()
		renderEventsLayer({ days, resources, resourceId: 1 })
		expect(screen.getByTestId('current-time-dot')).toBeInTheDocument()
	})

	test('does not render the indicator in day-resolution grids (issue #123)', () => {
		const today = startOf(now('UTC'), 'day')

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
		const futureDate = atUtc('2099-01-01T10:00:00.000Z')
		const hours = [futureDate]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('does not render the indicator when nowIndicator is off', () => {
		nowIndicator = false

		renderEventsLayer({
			days: [startOf(now('UTC'), 'hour')],
			gridType: 'hour',
			'data-testid': 'events-layer',
		})

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('uses custom renderCurrentTimeIndicator from context', () => {
		customRenderFn = TEST_CUSTOM_RENDER

		const rangeStart = startOf(now('UTC'), 'hour')
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

		const rangeStart = startOf(now('UTC'), 'hour')
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

		const rangeStart = startOf(now('UTC'), 'hour')
		const hours = [rangeStart]

		renderEventsLayer({ days: hours, 'data-testid': 'events-layer' })

		expect(receivedResource).toBeUndefined()
	})

	test('renders the snapped mirror when the candidate overlaps the column', () => {
		const day = atUtc('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => add(day, i, 'hour'))
		const start = withTime(day, { hour: 10 })
		const end = withTime(day, { hour: 12 })
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Dragging Meeting',
				start: toOffsetIso(start),
				end: toOffsetIso(end),
			},
			start,
			end,
			allDay: false,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		expect(screen.getByTestId(keys.dragPreview('vertical'))).toBeInTheDocument()
		expect(screen.getByText('Dragging Meeting')).toBeInTheDocument()
		expect(screen.getByText(/10:00\s*AM/i)).toBeInTheDocument()
		expect(screen.getByText(/12:00\s*PM/i)).toBeInTheDocument()
	})

	test('draws the mirror opaque, as the strongest surface in the grid', () => {
		const day = atUtc('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => add(day, i, 'hour'))
		const start = withTime(day, { hour: 10 })
		const end = withTime(day, { hour: 12 })
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Dragging Meeting',
				start: toOffsetIso(start),
				end: toOffsetIso(end),
			},
			start,
			end,
			allDay: false,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		const mirror = screen.getByTestId(keys.dragPreview('vertical'))
		expect(mirror.className).not.toContain('opacity-')
		expect(mirror.className.split(/\s+/)).toContain('inset-ring-2')
	})

	test('draws no mirror for an all-day candidate on an hour grid, which leaves those to its all-day row', () => {
		const day = atUtc('2025-01-01T00:00:00.000Z')
		const hours = Array.from({ length: 24 }, (_, i) => add(day, i, 'hour'))
		const start = startOf(day, 'day')
		const end = startOf(add(day, 1, 'day'), 'day')
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Company Offsite',
				start: toOffsetIso(start),
				end: toOffsetIso(end),
				allDay: true,
			},
			start,
			end,
			allDay: true,
		})

		renderEventsLayer({ days: hours, gridType: 'hour', preview })

		expect(
			screen.queryByTestId(keys.dragPreview('vertical'))
		).not.toBeInTheDocument()
	})

	test('mirrors an all-day candidate on a day grid with its title and no time', () => {
		const day = atUtc('2025-01-01T00:00:00.000Z')
		const days = Array.from({ length: 7 }, (_, i) => add(day, i, 'day'))
		const start = add(day, 1, 'day')
		const end = add(day, 3, 'day')
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Company Offsite',
				start: toOffsetIso(start),
				end: toOffsetIso(end),
				allDay: true,
			},
			start,
			end,
			allDay: true,
		})

		renderEventsLayer({ days, gridType: 'day', preview })

		const mirror = screen.getByTestId(keys.dragPreview('vertical'))
		expect(mirror.textContent).toBe('Company Offsite')
	})

	test('mirrors a timed candidate on a day grid with its time', () => {
		const day = atUtc('2025-01-01T00:00:00.000Z')
		const days = Array.from({ length: 7 }, (_, i) => add(day, i, 'day'))
		const start = withTime(add(day, 1, 'day'), { hour: 9 })
		const end = withTime(add(day, 2, 'day'), { hour: 17 })
		const preview = mkDragPreview({
			event: {
				id: 'event-dragged',
				title: 'Field trip',
				start: toOffsetIso(start),
				end: toOffsetIso(end),
			},
			start,
			end,
			allDay: false,
		})

		renderEventsLayer({ days, gridType: 'day', preview })

		const mirror = screen.getByTestId(keys.dragPreview('vertical'))
		expect(mirror.textContent?.replace(/\s+/g, ' ')).toBe(
			'9:00 AM – 5:00 PMField trip'
		)
	})
})
