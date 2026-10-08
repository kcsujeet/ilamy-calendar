import { mock, setSystemTime } from 'bun:test'
import type { BusinessHours, Resource, WeekDays } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'

/** A Wednesday, 09:00 UTC: the "now" every scroll test runs at. */
export const SCROLL_TEST_NOW = '2025-03-12T09:00:00.000Z'

/** Distinct from now, so a scroll to `scrollTime` lands somewhere else. */
export const SCROLL_TEST_SCROLL_TIME = '07:00'

/** How far apart the stubbed geometry puts consecutive hours. */
const PIXELS_PER_HOUR = 100

/** Business hours ending at 17:00; days default to Monday-Friday. */
export const buildBusinessHours = (
	startTime: number,
	daysOfWeek?: WeekDays[]
): BusinessHours => ({ daysOfWeek, startTime, endTime: 17 })

// happy-dom lays nothing out, so every rect is empty and every scroll lands on
// 0. Placing each hour row and timed cell PIXELS_PER_HOUR apart, by the hour it
// holds, lets a test tell which cell `useScrollToTime` scrolled to.
const hourOf = (element: HTMLElement): number => {
	const hourLabel = element.getAttribute('data-hour')
	if (hourLabel !== null) {
		return Number.parseInt(hourLabel, 10)
	}
	const cellStart = element.getAttribute('data-start')
	return cellStart ? dayjs(cellStart).utc().hour() : 0
}

const rectAtHour = (hour: number): DOMRect => {
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

// Other tests stub these methods at two levels: the grids' sticky-inset tests
// assign HTMLElement.prototype.getBoundingClientRect and restore it by
// assignment, which leaves an own property there, and the view tests swap
// Element.prototype.scrollTo. Installing on HTMLElement.prototype wins over
// both, and putting back exactly the property that was there leaves nothing
// for a later file to trip over.
const replaceOnHTMLElement = (
	name: 'scrollTo' | 'getBoundingClientRect',
	replacement: (this: HTMLElement, ...args: never[]) => unknown
) => {
	const prototype = HTMLElement.prototype
	const previous = Object.getOwnPropertyDescriptor(prototype, name)
	Object.defineProperty(prototype, name, {
		value: replacement,
		configurable: true,
		writable: true,
	})
	return () => {
		if (previous) {
			Object.defineProperty(prototype, name, previous)
			return
		}
		Reflect.deleteProperty(prototype, name)
	}
}

/**
 * Pins now, places hours along both axes, and records `scrollTo` without
 * moving anything. Call `restore` in `afterEach`.
 */
export const stubScrollGeometry = () => {
	setSystemTime(new Date(SCROLL_TEST_NOW))
	const scrollTo = mock((_options?: ScrollToOptions) => {})
	const restoreScrollTo = replaceOnHTMLElement('scrollTo', scrollTo)
	const restoreRects = replaceOnHTMLElement(
		'getBoundingClientRect',
		function (this: HTMLElement) {
			return rectAtHour(hourOf(this))
		}
	)
	const restore = () => {
		restoreScrollTo()
		restoreRects()
		setSystemTime()
	}
	return { scrollTo, restore }
}

/** Where the last scroll landed, in hours past the first visible hour. */
export const lastScrollInHours = (
	scrollTo: ReturnType<typeof stubScrollGeometry>['scrollTo']
): number | undefined => {
	const options = scrollTo.mock.calls.at(-1)?.at(0)
	const offset = options?.left ?? options?.top
	return offset === undefined ? undefined : offset / PIXELS_PER_HOUR
}

interface ScrollCalendarOptions {
	orientation: 'horizontal' | 'vertical'
	/** Business hours start; they end at 17:00. */
	startTime: number
	/** Whether the hours are the calendar's or each resource's own. */
	hoursOn?: 'calendar' | 'resources'
	scrollToNow?: boolean
	resourceCount?: number
}

/** A resource day view at SCROLL_TEST_NOW with non-business hours hidden. */
export const buildScrollCalendar = ({
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
