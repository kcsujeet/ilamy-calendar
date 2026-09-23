import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { overlapsRange } from '@ilamy/utils/helpers'
import { type RefObject, useEffect, useRef } from 'react'

type ScrollToTimeAxis = 'vertical' | 'horizontal'

interface UseScrollToTimeOptions {
	/**
	 * Ref to the actual scrolling element (e.g. the Radix ScrollArea viewport).
	 * The hook scrolls this element directly so the parent page is not affected.
	 */
	viewportRef: RefObject<HTMLElement | null>
	/** The hour to open on. A grid without hour rows or columns ignores it. */
	scrollTime?: string
	/**
	 * Open on the cell holding the current moment instead, whenever that cell is
	 * on screen; `scrollTime` is the fallback when it is not.
	 */
	scrollToNow?: boolean
	enabled: boolean
	scrollKey: string
	/**
	 * Vertical scrolls along the Y axis (`scrollTop`), horizontal along the X
	 * axis (`scrollLeft`).
	 *
	 * @default 'vertical'
	 */
	axis?: ScrollToTimeAxis
}

const HOUR_PATTERN = /^(\d{1,2})(?::\d{1,2})?(?::\d{1,2})?$/
const HOUR_SELECTOR = '[data-hour]'
// Every droppable cell reports its own `[start, end)`. All-day cells are left
// out: they contain now in every time grid, and sit outside its time area.
const TIMED_CELL_SELECTOR = '[data-start]:not([data-all-day="true"])'

const parseHour = (time: string): number | null => {
	const match = HOUR_PATTERN.exec(time)
	const hourDigits = match?.at(1)
	if (!hourDigits) {
		return null
	}
	const hour = Number.parseInt(hourDigits, 10)
	const isInRange = hour >= 0 && hour <= 23
	return isInRange ? hour : null
}

const readRowHour = (row: HTMLElement): number =>
	Number.parseInt(row.getAttribute('data-hour') ?? '', 10)

const findTargetRow = (
	rows: HTMLElement[],
	targetHour: number
): HTMLElement | null => {
	const firstRow = rows.at(0)
	const lastRow = rows.at(-1)
	if (!firstRow || !lastRow) {
		return null
	}

	if (targetHour <= readRowHour(firstRow)) {
		return firstRow
	}
	if (targetHour >= readRowHour(lastRow)) {
		return lastRow
	}
	return rows.find((row) => readRowHour(row) === targetHour) ?? null
}

interface ScrollTarget {
	target: HTMLElement
	/** The first element of the time area; the target is lined up with it. */
	origin: HTMLElement
}

// A missing attribute reads as `''`, which dayjs parses as invalid, so the cell
// overlaps nothing. `dayjs(undefined)` would read as now and match every time.
const readCellInterval = (cell: HTMLElement): { start: Dayjs; end: Dayjs } => ({
	start: dayjs(cell.dataset.start ?? ''),
	end: dayjs(cell.dataset.end ?? ''),
})

/**
 * The cell holding the current moment, whatever the grid's resolution: an hour
 * or slot in a time grid, a whole day in a day-column grid. Compares instants,
 * so the calendar's zone cannot move the answer. Null when now is not on
 * screen, including when it falls in a hidden hour or day.
 */
const findNowTarget = (viewport: HTMLElement): ScrollTarget | null => {
	const cells = Array.from(
		viewport.querySelectorAll<HTMLElement>(TIMED_CELL_SELECTOR)
	)
	const origin = cells.at(0)
	const now = dayjs()
	// A zero-length range at now: a cell overlaps it exactly when its start is
	// at or before now and its exclusive end after it.
	const target = cells.find((cell) =>
		overlapsRange(readCellInterval(cell), now, now)
	)
	if (!origin || !target) {
		return null
	}
	return { target, origin }
}

const findScrollTimeTarget = (
	viewport: HTMLElement,
	scrollTime: string | undefined
): ScrollTarget | null => {
	const targetHour = scrollTime ? parseHour(scrollTime) : null
	if (targetHour === null) {
		return null
	}
	const rows = Array.from(viewport.querySelectorAll<HTMLElement>(HOUR_SELECTOR))
	const origin = rows.at(0)
	const target = findTargetRow(rows, targetHour)
	if (!origin || !target) {
		return null
	}
	return { target, origin }
}

const scrollViewportToRow = (
	viewport: HTMLElement,
	targetRow: HTMLElement,
	firstRow: HTMLElement,
	axis: ScrollToTimeAxis
) => {
	// Use the first row as the reference for "starting position of the time
	// area." It naturally sits past any sticky-left (or sticky-top) header
	// like the Resources column. Setting scrollLeft/scrollTop to the offset
	// from first row to target row lands the target where the first row sat,
	// i.e. right at the start of the visible time area instead of behind the
	// sticky column.
	const targetRect = targetRow.getBoundingClientRect()
	const firstRect = firstRow.getBoundingClientRect()
	const horizontalOffset = targetRect.left - firstRect.left
	const verticalOffset = targetRect.top - firstRect.top
	const offset = axis === 'horizontal' ? horizontalOffset : verticalOffset
	scrollViewportAlong(viewport, axis, offset)
}

const scrollViewportAlong = (
	viewport: HTMLElement,
	axis: ScrollToTimeAxis,
	offset: number
) => {
	const edge = axis === 'horizontal' ? 'left' : 'top'
	viewport.scrollTo({ [edge]: offset, behavior: 'auto' })
}

/**
 * Scrolls to now when asked and on screen, else to scrollTime. Returns whether
 * it scrolled, so a grid whose rows are not in the DOM yet is tried again.
 */
const applyScroll = (
	viewport: HTMLElement,
	{
		scrollTime,
		scrollToNow,
		axis,
	}: { scrollTime?: string; scrollToNow: boolean; axis: ScrollToTimeAxis }
): boolean => {
	const nowTarget = scrollToNow ? findNowTarget(viewport) : null
	const scrollTarget = nowTarget ?? findScrollTimeTarget(viewport, scrollTime)
	if (scrollTarget) {
		scrollViewportToRow(
			viewport,
			scrollTarget.target,
			scrollTarget.origin,
			axis
		)
		return true
	}
	if (scrollToNow) {
		// A range without now, and no scrollTime to fall back to: open on the
		// range start, as FullCalendar does, rather than keeping the offset the
		// previous range scrolled to.
		scrollViewportAlong(viewport, axis, 0)
		return true
	}
	return false
}

export const useScrollToTime = ({
	viewportRef,
	scrollTime,
	scrollToNow = false,
	enabled,
	scrollKey,
	axis = 'vertical',
}: UseScrollToTimeOptions) => {
	const lastScrolledKeyRef = useRef<string | null>(null)

	useEffect(() => {
		if (!enabled) {
			return
		}
		// Scroll once per date range and setting, never on an ordinary re-render,
		// so the user's own scrolling is left alone. The settings are part of the
		// key because FullCalendar reapplies a changed scrollTime immediately
		// rather than at the next navigation. The current moment is not: now
		// moving into the next hour must not pull the grid out from under a
		// reader.
		const appliedKey = `${scrollKey}|${scrollTime}|${scrollToNow}`
		if (lastScrolledKeyRef.current === appliedKey) {
			return
		}

		const viewport = viewportRef.current
		if (!viewport) {
			return
		}
		const didScroll = applyScroll(viewport, { scrollTime, scrollToNow, axis })
		if (didScroll) {
			lastScrolledKeyRef.current = appliedKey
		}
	}, [enabled, scrollTime, scrollToNow, scrollKey, viewportRef, axis])
}
