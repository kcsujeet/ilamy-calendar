import {
	afterEach,
	beforeEach,
	expect,
	mock,
	setSystemTime,
	test,
} from 'bun:test'
import { getViewHours } from '@ilamy/core'
import type { BusinessHours, Resource, WeekDays } from '@ilamy/types'
import { parseDate, toOffsetIso } from '@ilamy/utils/temporal'
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import type { IlamyCalendarProps } from '@/features/calendar/types'

/** A Wednesday, 09:00 UTC: the "now" every scroll test runs at. */
export const SCROLL_TEST_NOW = '2025-03-12T09:00:00.000Z'
const NOW_HOUR = 9

const SCROLL_TEST_SCROLL_TIME = '07:00'
const SCROLL_TIME_HOUR = 7

export const NARROW_BUSINESS_START_HOUR = 12
export const WIDE_BUSINESS_START_HOUR = 6
export const MID_BUSINESS_START_HOUR = 9
const BUSINESS_END_HOUR = 17

const PIXELS_PER_HOUR = 100

type ScrollGridOrientation = NonNullable<IlamyCalendarProps['orientation']>

// Omitting `daysOfWeek` defaults to Mon–Fri (which covers Wednesday SCROLL_TEST_NOW).
const buildBusinessHours = (
	startTime: number,
	daysOfWeek?: WeekDays[]
): BusinessHours => ({ daysOfWeek, startTime, endTime: BUSINESS_END_HOUR })

/** The hour ISO strings a day at SCROLL_TEST_NOW shows when business hours open at `startTime`. */
export const getVisibleHours = (startTime: number): string[] => {
	const referenceDate = parseDate(SCROLL_TEST_NOW, 'UTC')
	if (!referenceDate) {
		throw new Error(`Invalid SCROLL_TEST_NOW: ${SCROLL_TEST_NOW}`)
	}
	return getViewHours({
		referenceDate,
		businessHours: buildBusinessHours(startTime),
		hideNonBusinessHours: true,
	}).map(toOffsetIso)
}

const getHourOfElement = (element: HTMLElement): number => {
	const hourLabel = element.getAttribute('data-hour')
	if (hourLabel !== null) {
		return Number.parseInt(hourLabel, 10)
	}
	const cellStart = element.getAttribute('data-start')
	return cellStart ? (parseDate(cellStart, 'UTC')?.hour ?? 0) : 0
}

const buildRectAtHour = (hour: number): DOMRect => {
	const offset = hour * PIXELS_PER_HOUR
	return {
		x: offset,
		y: offset,
		left: offset,
		top: offset,
		right: offset,
		bottom: offset,
		width: 0,
		height: 0,
		toJSON: () => ({}),
	}
}

const replaceOnHTMLElement = (
	name: 'scrollTo' | 'getBoundingClientRect',
	replacement: (this: HTMLElement, ...args: never[]) => unknown
) => {
	const prototype = HTMLElement.prototype
	const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, name)
	Object.defineProperty(prototype, name, {
		value: replacement,
		configurable: true,
		writable: true,
	})
	return () => {
		if (originalDescriptor) {
			Object.defineProperty(prototype, name, originalDescriptor)
			return
		}
		Reflect.deleteProperty(prototype, name)
	}
}

const stubScrollGeometry = () => {
	setSystemTime(new Date(SCROLL_TEST_NOW))
	const scrollTo = mock((_options?: ScrollToOptions) => {})
	const restoreScrollTo = replaceOnHTMLElement('scrollTo', scrollTo)
	const restoreRects = replaceOnHTMLElement(
		'getBoundingClientRect',
		function (this: HTMLElement) {
			return buildRectAtHour(getHourOfElement(this))
		}
	)
	const restoreScrollGeometry = () => {
		restoreScrollTo()
		restoreRects()
		setSystemTime()
	}
	return { scrollTo, restoreScrollGeometry }
}

type ScrollToMock = ReturnType<typeof stubScrollGeometry>['scrollTo']

export const setUpScrollGeometry = () => {
	let geometry: ReturnType<typeof stubScrollGeometry> | undefined
	beforeEach(() => {
		geometry = stubScrollGeometry()
	})
	afterEach(() => {
		cleanup()
		geometry?.restoreScrollGeometry()
	})
	return (): ScrollToMock => {
		if (!geometry) {
			throw new Error('setUpScrollGeometry: no test is running')
		}
		return geometry.scrollTo
	}
}

const getLastScrollInHours = (scrollTo: ScrollToMock): number | undefined => {
	const options = scrollTo.mock.calls.at(-1)?.at(0)
	const offset = options?.left ?? options?.top
	return offset === undefined ? undefined : offset / PIXELS_PER_HOUR
}

interface ScrollCalendarOptions {
	orientation: ScrollGridOrientation
	startTime: number
	hoursOn?: 'calendar' | 'resources'
	scrollToNow?: boolean
	resourceCount?: number
}

const buildScrollCalendar = ({
	orientation,
	startTime,
	hoursOn = 'calendar',
	scrollToNow = true,
	resourceCount = 1,
}: ScrollCalendarOptions) => {
	const businessHours = buildBusinessHours(startTime)
	const isResourceHours = hoursOn === 'resources'
	const resourceHours = isResourceHours ? businessHours : undefined
	const calendarHours = isResourceHours ? undefined : businessHours
	const resources: Resource[] = Array.from(
		{ length: resourceCount },
		(_, index) => ({
			id: `room-${index}`,
			title: `Room ${index}`,
			businessHours: resourceHours,
		})
	)
	return (
		<IlamyCalendar
			businessHours={calendarHours}
			events={[]}
			hideNonBusinessHours
			initialDate={SCROLL_TEST_NOW}
			initialView="day"
			orientation={orientation}
			resources={resources}
			scrollTime={SCROLL_TEST_SCROLL_TIME}
			scrollToNow={scrollToNow}
			timezone="UTC"
		/>
	)
}

const NON_WEDNESDAY_DAYS: WeekDays[] = [
	'monday',
	'tuesday',
	'thursday',
	'friday',
	'saturday',
]

export const buildScrollWeek = (
	orientation: ScrollGridOrientation,
	wednesdayStart: number
) => (
	<IlamyCalendar
		businessHours={[
			buildBusinessHours(WIDE_BUSINESS_START_HOUR, ['sunday']),
			buildBusinessHours(NARROW_BUSINESS_START_HOUR, NON_WEDNESDAY_DAYS),
			buildBusinessHours(wednesdayStart, ['wednesday']),
		]}
		events={[]}
		hideNonBusinessHours
		initialDate={SCROLL_TEST_NOW}
		initialView="week"
		orientation={orientation}
		resources={[{ id: 'room', title: 'Room' }]}
		scrollToNow
		timezone="UTC"
	/>
)

export const ScrollTestProvider = ({ children }: { children: ReactNode }) => (
	<CalendarProvider
		initialDate={SCROLL_TEST_NOW}
		scrollTime={SCROLL_TEST_SCROLL_TIME}
		scrollToNow
		timezone="UTC"
	>
		{children}
	</CalendarProvider>
)

export const testScrollingWhenHoursChange = (
	orientation: ScrollGridOrientation,
	getScrollTo: () => ScrollToMock
) => {
	const buildCalendar = (options: Omit<ScrollCalendarOptions, 'orientation'>) =>
		buildScrollCalendar({ orientation, ...options })

	test('scrolls to now once the widened hours show it', () => {
		const { rerender } = render(
			buildCalendar({ startTime: NARROW_BUSINESS_START_HOUR })
		)
		expect(getLastScrollInHours(getScrollTo())).toBe(0)

		rerender(buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR }))

		expect(getScrollTo()).toHaveBeenCalledTimes(2)
		expect(getLastScrollInHours(getScrollTo())).toBe(
			NOW_HOUR - WIDE_BUSINESS_START_HOUR
		)
	})

	test('reapplies scrollTime alone when the hours change', () => {
		const { rerender } = render(
			buildCalendar({
				startTime: NARROW_BUSINESS_START_HOUR,
				scrollToNow: false,
			})
		)
		rerender(
			buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR, scrollToNow: false })
		)

		expect(getScrollTo()).toHaveBeenCalledTimes(2)
		expect(getLastScrollInHours(getScrollTo())).toBe(
			SCROLL_TIME_HOUR - WIDE_BUSINESS_START_HOUR
		)
	})

	test.each(['calendar', 'resources'] as const)(
		'reapplies when the %s hours change',
		(hoursOn) => {
			const { rerender } = render(
				buildCalendar({ startTime: NARROW_BUSINESS_START_HOUR, hoursOn })
			)
			rerender(buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR, hoursOn }))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		}
	)

	test('leaves the scroll alone when the hours stay equal', () => {
		const { rerender } = render(
			buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR })
		)
		rerender(buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR }))

		expect(getScrollTo()).toHaveBeenCalledTimes(1)
	})

	test('leaves the scroll alone when a resource is added with equal hours', () => {
		const { rerender } = render(
			buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR })
		)
		rerender(
			buildCalendar({ startTime: WIDE_BUSINESS_START_HOUR, resourceCount: 2 })
		)

		expect(getScrollTo()).toHaveBeenCalledTimes(1)
	})
}
