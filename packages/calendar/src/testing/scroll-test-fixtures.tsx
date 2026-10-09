import {
	afterEach,
	beforeEach,
	expect,
	mock,
	setSystemTime,
	test,
} from 'bun:test'
import type { BusinessHours, Resource, WeekDays } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { getViewHours } from '@/features/calendar/utils/view-hours'

/** A Wednesday, 09:00 UTC: the "now" every scroll test runs at. */
export const SCROLL_TEST_NOW = '2025-03-12T09:00:00.000Z'
const NOW_HOUR = 9

/** Distinct from now, so a scroll to `scrollTime` lands somewhere else. */
const SCROLL_TEST_SCROLL_TIME = '07:00'
const SCROLL_TIME_HOUR = 7

/** Business hours opening at noon hide now; opening at six show it. */
export const NARROW_BUSINESS_START_HOUR = 12
export const WIDE_BUSINESS_START_HOUR = 6
/** Between the two, so a day opening then stays inside a week's 06:00-17:00 range. */
export const MID_BUSINESS_START_HOUR = 9
const BUSINESS_END_HOUR = 17

const PIXELS_PER_HOUR = 100

type ScrollGridOrientation = NonNullable<IlamyCalendarProps['orientation']>

// Without `daysOfWeek` the hours apply to every day (business-hours.ts).
const buildBusinessHours = (
	startTime: number,
	daysOfWeek?: WeekDays[]
): BusinessHours => ({ daysOfWeek, startTime, endTime: BUSINESS_END_HOUR })

/** The hours a day at SCROLL_TEST_NOW shows when business hours open at `startTime`. */
export const getVisibleHours = (startTime: number) =>
	getViewHours({
		referenceDate: dayjs(SCROLL_TEST_NOW),
		businessHours: buildBusinessHours(startTime),
		hideNonBusinessHours: true,
	})

// happy-dom lays nothing out, so every scroll would land on 0. Placing each
// hour row and timed cell by its hour lets a test see which one was targeted.
const getHourOfElement = (element: HTMLElement): number => {
	const hourLabel = element.getAttribute('data-hour')
	if (hourLabel !== null) {
		return Number.parseInt(hourLabel, 10)
	}
	const cellStart = element.getAttribute('data-start')
	return cellStart ? dayjs(cellStart).utc().hour() : 0
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

// Other test files leave stubs of these on both Element.prototype and
// HTMLElement.prototype; this one wins over both and leaves nothing behind.
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

/**
 * Stubs the scroll geometry around every test in the calling `describe`.
 * Returns a getter for the current test's `scrollTo` mock.
 */
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

/** Where the last scroll landed, in hours past the first visible hour. */
const getLastScrollInHours = (scrollTo: ScrollToMock): number | undefined => {
	const options = scrollTo.mock.calls.at(-1)?.at(0)
	const offset = options?.left ?? options?.top
	return offset === undefined ? undefined : offset / PIXELS_PER_HOUR
}

interface ScrollCalendarOptions {
	orientation: ScrollGridOrientation
	/** Business hours start; they end at 17:00. */
	startTime: number
	/** Whether the hours are the calendar's or each resource's own. */
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

/**
 * A resource week whose Sunday opens at 06:00, Wednesday at `wednesdayStart`,
 * and every other day at noon, so only Wednesday's hours move between renders.
 */
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

/** The calendar state a bare grid needs to scroll: now, scrollTime, UTC. */
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

/**
 * The tests both grids share: what a change in hours, or in resources, does
 * to the initial scroll of a resource day view in `orientation`.
 */
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
		// Now is hidden, so it falls back to scrollTime, clamped to the first hour.
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
