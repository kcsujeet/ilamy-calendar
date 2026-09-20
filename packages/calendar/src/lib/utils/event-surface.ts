import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'

/**
 * How an event's appearance reaches the DOM, in one place so every surface that
 * wears it agrees: the bar and the drag mirror.
 *
 * `backgroundColor` and `color` each accept either a Tailwind class or a CSS
 * colour, so both are handed to `cn` (twMerge lets a later `bg-*` win) AND set
 * inline (where only a real CSS colour applies). Reading `backgroundColor`
 * alone is not enough: an event may carry its whole fill in `color`, the way
 * the playground's seed data does (`color: 'bg-teal-100 text-teal-800'`, no
 * `backgroundColor`), and a reader that misses it paints every event the same
 * fallback blue.
 */
export const eventSurfaceClasses = (event: CalendarEvent): string =>
	cn(event.backgroundColor || 'bg-blue-500', event.color || 'text-white')

export const eventSurfaceStyle = (event: CalendarEvent) => ({
	backgroundColor: event.backgroundColor,
	color: event.color,
})

interface EventSurfaceRadiusInput {
	/** The axis the grid's time runs along, which decides which corners can square. */
	axis: 'vertical' | 'horizontal'
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

/**
 * Which corners an event segment rounds. Stated as what the segment HOLDS: a
 * side the visible range cut off is drawn square, because the span continues
 * past it. The bar and the drag mirror both read this — a mirror that stayed
 * fully rounded would claim the drop ends inside a row it actually spills out
 * of.
 *
 * Only a horizontal grid squares anything, which is FullCalendar's rule:
 * `.fc-daygrid-block-event:not(.fc-event-start)` zeroes the left radii and
 * `:not(.fc-event-end)` the right, while timegrid carries no such rule and
 * leaves its events fully rounded. A time column is cut along the VERTICAL
 * axis, so squaring its left and right edges marks the wrong two sides — and
 * that bar is horizontally complete inside its own column anyway.
 */
export const eventSurfaceRadius = ({
	axis,
	isTruncatedStart,
	isTruncatedEnd,
}: EventSurfaceRadiusInput): string => {
	if (axis === 'vertical') {
		return 'rounded-md'
	}
	if (isTruncatedStart && isTruncatedEnd) {
		return 'rounded-none'
	}
	if (isTruncatedStart) {
		return 'rounded-r-md rounded-l-none'
	}
	if (isTruncatedEnd) {
		return 'rounded-l-md rounded-r-none'
	}
	return 'rounded-md'
}
