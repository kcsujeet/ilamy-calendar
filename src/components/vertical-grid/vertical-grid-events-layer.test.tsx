import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import type { RenderCurrentTimeIndicatorProps } from '@/features/calendar/types'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
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
}> = ({ children, view = 'day' }) => (
	<CalendarContext.Provider
		value={
			{
				renderCurrentTimeIndicator: customRenderFn,
				events: [],
				getEventsForDateRange: () => [],
				view,
			} as never
		}
	>
		{children}
	</CalendarContext.Provider>
)

const renderEventsLayer = (props: {
	days: dayjs.Dayjs[]
	resource?: Resource
	view?: CalendarView
	'data-testid'?: string
}) => {
	return render(
		<TestWrapper view={props.view}>
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
})
