import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import type { RenderCurrentTimeIndicatorProps } from '@/features/calendar/types'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import type { CalendarView } from '@/types'
import { CurrentTimeIndicator } from './current-time-indicator'

/**
 * Shared custom render implementation for tests.
 * Displays time, progress and column index for verification.
 */
const TEST_CUSTOM_RENDER = ({
	currentTime,
	progress,
	resource,
	view,
}: RenderCurrentTimeIndicatorProps) => (
	<div data-testid="custom-indicator">
		<span data-testid="custom-time">{currentTime.format('HH:mm')}</span>
		<span data-testid="custom-progress">{progress}%</span>
		<span data-testid="custom-resource-id">{resource?.id || 'none'}</span>
		<span data-testid="custom-view">{view}</span>
	</div>
)

// Mutable test configuration - can be changed per test
let customRenderFn:
	| ((props: RenderCurrentTimeIndicatorProps) => React.ReactNode)
	| undefined

/**
 * Test wrapper using CalendarContext.Provider directly.
 * Provides the context structure needed for CurrentTimeIndicator.
 */
const TestWrapper: React.FC<{
	children: React.ReactNode
	view?: CalendarView
}> = ({ children, view = 'day' }) => (
	<CalendarContext.Provider
		value={
			{
				renderCurrentTimeIndicator: customRenderFn,
				view,
			} as never
		}
	>
		{children}
	</CalendarContext.Provider>
)

interface IndicatorProps {
	rangeStart: dayjs.Dayjs
	rangeEnd: dayjs.Dayjs
	now?: dayjs.Dayjs
	resource?: Resource
	view?: CalendarView
}

/**
 * Helper component that wraps CurrentTimeIndicator in the test context.
 * Useful for both render and rerender calls.
 */
const Indicator = ({ view, ...props }: IndicatorProps) => (
	<TestWrapper view={view}>
		<CurrentTimeIndicator {...props} />
	</TestWrapper>
)

const renderIndicator = (props: IndicatorProps) => {
	return render(<Indicator {...props} />)
}

describe('CurrentTimeIndicator', () => {
	beforeEach(() => {
		customRenderFn = undefined
		cleanup()
	})

	test('renders correctly in a vertical time range (e.g. Day View column)', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('50%')
	})

	test('renders correctly in a multi-hour range', () => {
		const rangeStart = dayjs('2025-01-01T00:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'day')
		const now = dayjs('2025-01-01T06:00:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('25%')
	})

	test('does not render if now is before range', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T09:59:59.999Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('does not render if now is after range', () => {
		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T11:00:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('respects date boundaries', () => {
		const jan1 = dayjs('2025-01-01T00:00:00.000Z')
		const jan1End = jan1.add(1, 'day')
		const jan2 = dayjs('2025-01-02T00:00:00.000Z')
		const jan2End = jan2.add(1, 'day')
		const now = dayjs('2025-01-01T12:00:00.000Z')

		const { rerender } = renderIndicator({
			now,
			rangeEnd: jan1End,
			rangeStart: jan1,
		})
		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()

		// Use Indicator helper for rerender as well
		rerender(<Indicator now={now} rangeEnd={jan2End} rangeStart={jan2} />)
		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('uses custom renderCurrentTimeIndicator from context', () => {
		customRenderFn = TEST_CUSTOM_RENDER

		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T10:30:00.000Z')

		renderIndicator({
			rangeStart,
			rangeEnd,
			now,
			resource: { id: 'test-resource', title: 'Test Resource' } as Resource,
			view: 'week',
		})

		expect(screen.getByTestId('custom-indicator')).toBeInTheDocument()
		expect(screen.getByTestId('custom-time')).toHaveTextContent('10:30')
		expect(screen.getByTestId('custom-progress')).toHaveTextContent('50%')
		expect(screen.getByTestId('custom-resource-id')).toHaveTextContent(
			'test-resource'
		)
		expect(screen.getByTestId('custom-view')).toHaveTextContent('week')
		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('resource is undefined when not provided', () => {
		let receivedResource: any

		customRenderFn = (props) => {
			receivedResource = props.resource
			return TEST_CUSTOM_RENDER(props)
		}

		const rangeStart = dayjs('2025-01-01T10:00:00.000Z')
		const rangeEnd = rangeStart.add(1, 'hour')
		const now = dayjs('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(receivedResource).toBeUndefined()
	})

	test('passes correct props to custom render function', () => {
		let receivedProps: RenderCurrentTimeIndicatorProps | null = null

		customRenderFn = (props) => {
			receivedProps = props
			return TEST_CUSTOM_RENDER(props)
		}

		const rangeStart = dayjs('2025-01-01T08:00:00.000Z')
		const rangeEnd = dayjs('2025-01-01T18:00:00.000Z')
		const now = dayjs('2025-01-01T13:00:00.000Z')
		const resource = { id: 'res-1', title: 'Res 1' } as Resource
		const view = 'day'

		renderIndicator({ rangeStart, rangeEnd, now, resource, view })

		expect(receivedProps).not.toBeNull()
		expect(receivedProps?.currentTime.isSame(now)).toBe(true)
		expect(receivedProps?.rangeStart.isSame(rangeStart)).toBe(true)
		expect(receivedProps?.rangeEnd.isSame(rangeEnd)).toBe(true)
		expect(receivedProps?.progress).toBe(50)
		expect(receivedProps?.resource).toEqual(resource)
		expect(receivedProps?.view).toBe(view)
	})
})
