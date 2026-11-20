import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import {
	add,
	parseDate,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { CalendarContext } from '@/features/calendar/stores/calendar-context/calendar-context'
import type { RenderCurrentTimeIndicatorProps } from '@/features/calendar/types'
import type { CalendarView } from '@/types'
import { CurrentTimeMarker } from './current-time-marker'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const formatHHmm = (iso: string): string => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		return ''
	}
	return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
}

const TEST_CUSTOM_RENDER = ({
	currentTime,
	progress,
	resource,
	view,
}: RenderCurrentTimeIndicatorProps) => (
	<div data-testid="custom-indicator">
		<span data-testid="custom-time">{formatHHmm(currentTime)}</span>
		<span data-testid="custom-progress">{progress}%</span>
		<span data-testid="custom-resource-id">{resource?.id || 'none'}</span>
		<span data-testid="custom-view">{view}</span>
	</div>
)

let customRenderFn:
	| ((props: RenderCurrentTimeIndicatorProps) => React.ReactNode)
	| undefined

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
	rangeStart: ZonedDate
	rangeEnd: ZonedDate
	now?: ZonedDate
	resource?: Resource
	view?: CalendarView
	axis?: 'vertical' | 'horizontal'
}

const Indicator = ({ view, ...props }: IndicatorProps) => (
	<TestWrapper view={view}>
		<CurrentTimeMarker {...props} />
	</TestWrapper>
)

const renderIndicator = (props: IndicatorProps) => {
	return render(<Indicator {...props} />)
}

describe('CurrentTimeMarker', () => {
	beforeEach(() => {
		customRenderFn = undefined
		cleanup()
	})

	test('renders correctly in a vertical time range (e.g. Day View column)', () => {
		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('50%')
	})

	test('renders correctly in a multi-hour range', () => {
		const rangeStart = atUtc('2025-01-01T00:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'day')
		const now = atUtc('2025-01-01T06:00:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.top).toBe('25%')
	})

	test('does not render if now is before range', () => {
		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T09:59:59.999Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('does not render if now is after range', () => {
		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T11:00:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('respects date boundaries', () => {
		const jan1 = atUtc('2025-01-01T00:00:00.000Z')
		const jan1End = add(jan1, 1, 'day')
		const jan2 = atUtc('2025-01-02T00:00:00.000Z')
		const jan2End = add(jan2, 1, 'day')
		const now = atUtc('2025-01-01T12:00:00.000Z')

		const { rerender } = renderIndicator({
			now,
			rangeEnd: jan1End,
			rangeStart: jan1,
		})
		expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()

		rerender(<Indicator now={now} rangeEnd={jan2End} rangeStart={jan2} />)
		expect(
			screen.queryByTestId('current-time-indicator')
		).not.toBeInTheDocument()
	})

	test('uses custom renderCurrentTimeIndicator from context', () => {
		customRenderFn = TEST_CUSTOM_RENDER

		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T10:30:00.000Z')

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
		let receivedResource: Resource | undefined

		customRenderFn = (props) => {
			receivedResource = props.resource
			return TEST_CUSTOM_RENDER(props)
		}

		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now })

		expect(receivedResource).toBeUndefined()
	})

	test('passes ISO string props to custom render function', () => {
		let receivedProps: RenderCurrentTimeIndicatorProps | null = null

		customRenderFn = (props) => {
			receivedProps = props
			return TEST_CUSTOM_RENDER(props)
		}

		const rangeStart = atUtc('2025-01-01T08:00:00.000Z')
		const rangeEnd = atUtc('2025-01-01T18:00:00.000Z')
		const now = atUtc('2025-01-01T13:00:00.000Z')
		const resource = { id: 'res-1', title: 'Res 1' } as Resource
		const view = 'day'

		renderIndicator({ rangeStart, rangeEnd, now, resource, view })

		const props = receivedProps as RenderCurrentTimeIndicatorProps | null
		expect(props).not.toBeNull()
		expect(props?.currentTime).toBe(toOffsetIso(now))
		expect(props?.rangeStart).toBe(toOffsetIso(rangeStart))
		expect(props?.rangeEnd).toBe(toOffsetIso(rangeEnd))
		expect(props?.progress).toBe(50)
		expect(props?.resource).toEqual(resource)
		expect(props?.view).toBe(view)
		expect(props?.axis).toBe('vertical')
	})

	test('renders horizontally positioned default indicator when axis="horizontal"', () => {
		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now, axis: 'horizontal' })

		const indicator = screen.getByTestId('current-time-indicator')
		expect(indicator).toBeInTheDocument()
		expect(indicator.style.left).toBe('50%')
		expect(indicator.style.top).toBe('')
	})

	test('forwards axis="horizontal" to custom render function', () => {
		let receivedProps: RenderCurrentTimeIndicatorProps | null = null

		customRenderFn = (props) => {
			receivedProps = props
			return TEST_CUSTOM_RENDER(props)
		}

		const rangeStart = atUtc('2025-01-01T10:00:00.000Z')
		const rangeEnd = add(rangeStart, 1, 'hour')
		const now = atUtc('2025-01-01T10:30:00.000Z')

		renderIndicator({ rangeStart, rangeEnd, now, axis: 'horizontal' })

		const props = receivedProps as RenderCurrentTimeIndicatorProps | null
		expect(props?.axis).toBe('horizontal')
		expect(props?.progress).toBe(50)
	})
})
