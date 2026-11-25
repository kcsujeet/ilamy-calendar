import {
	elapsedDiff,
	now,
	overlapsRange,
	parseDate,
	type ZonedInterval,
} from './temporal'

export interface ScrollRequest {
	time: string
}

export type ScrollToTimeAxis = 'vertical' | 'horizontal'

const TIME_PATTERN = /^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/
const SECONDS_PER_HOUR = 3600
const MS_PER_DAY = 24 * 60 * 60 * 1000
const HOUR_SELECTOR = '[data-hour]'
const TIMED_CELL_SELECTOR = '[data-start]:not([data-all-day="true"])'
const ANY_CELL_SELECTOR = '[data-start]'

interface ParsedTime {
	hour: number
	hourFraction: number
}

interface ScrollTarget {
	target: HTMLElement
	origin: HTMLElement
	fraction: number
}

const parseTimeToHourFraction = (time: string): ParsedTime | null => {
	const match = TIME_PATTERN.exec(time)
	const hourDigits = match?.at(1)
	if (!hourDigits) return null
	const hour = Number.parseInt(hourDigits, 10)
	const minute = Number.parseInt(match?.at(2) ?? '0', 10)
	const second = Number.parseInt(match?.at(3) ?? '0', 10)
	if (hour > 23 || minute > 59 || second > 59) return null
	return { hour, hourFraction: (minute * 60 + second) / SECONDS_PER_HOUR }
}

const readRowHour = (row: HTMLElement): number =>
	Number.parseInt(row.getAttribute('data-hour') ?? '', 10)

const firstDayRows = (rows: HTMLElement[]): HTMLElement[] => {
	const firstDayEnd = rows.findIndex((row, index) => {
		const previousRow = rows.at(index - 1)
		return (
			index > 0 &&
			previousRow !== undefined &&
			readRowHour(row) <= readRowHour(previousRow)
		)
	})
	return firstDayEnd === -1 ? rows : rows.slice(0, firstDayEnd)
}

const findTargetRow = (
	rows: HTMLElement[],
	targetHour: number
): HTMLElement | null => {
	const firstRow = rows.at(0)
	const lastRow = rows.at(-1)
	if (!firstRow || !lastRow) return null
	if (targetHour <= readRowHour(firstRow)) return firstRow
	if (targetHour >= readRowHour(lastRow)) return lastRow
	return rows.find((row) => readRowHour(row) === targetHour) ?? null
}

const readCellInterval = (cell: HTMLElement): ZonedInterval | null => {
	const start = parseDate(cell.dataset.start, 'UTC')
	const end = parseDate(cell.dataset.end, 'UTC')
	if (!start || !end) return null
	return { start, end }
}

const findNowTarget = (viewport: HTMLElement): ScrollTarget | null => {
	const timedCells = Array.from(
		viewport.querySelectorAll<HTMLElement>(TIMED_CELL_SELECTOR)
	)
	const cells =
		timedCells.length > 0
			? timedCells
			: Array.from(viewport.querySelectorAll<HTMLElement>(ANY_CELL_SELECTOR))
	const origin = cells.at(0)
	const currentMoment = now('UTC')
	const target = cells.find((cell) => {
		const interval = readCellInterval(cell)
		return interval
			? overlapsRange(interval, currentMoment, currentMoment)
			: false
	})
	const interval = target ? readCellInterval(target) : null
	if (!origin || !target || !interval) return null
	const cellMs = elapsedDiff(interval.end, interval.start, 'millisecond')
	const isTimeCell = cellMs > 0 && cellMs < MS_PER_DAY
	const fraction = isTimeCell
		? elapsedDiff(currentMoment, interval.start, 'millisecond') / cellMs
		: 0
	return { target, origin, fraction }
}

const findScrollTimeTarget = (
	viewport: HTMLElement,
	scrollTime: string | undefined
): ScrollTarget | null => {
	const parsed = scrollTime ? parseTimeToHourFraction(scrollTime) : null
	if (parsed === null) return null
	const rows = firstDayRows(
		Array.from(viewport.querySelectorAll<HTMLElement>(HOUR_SELECTOR))
	)
	const origin = rows.at(0)
	const target = findTargetRow(rows, parsed.hour)
	if (!origin || !target) return null
	const fraction = readRowHour(target) === parsed.hour ? parsed.hourFraction : 0
	return { target, origin, fraction }
}

const scrollViewportAlong = (
	viewport: HTMLElement,
	axis: ScrollToTimeAxis,
	offset: number
) => {
	const edge = axis === 'horizontal' ? 'left' : 'top'
	if (typeof viewport.scrollTo === 'function') {
		viewport.scrollTo({ [edge]: offset, behavior: 'auto' })
	} else if (axis === 'horizontal') {
		viewport.scrollLeft = offset
	} else {
		viewport.scrollTop = offset
	}
}

const applyScrollToTime = (
	viewport: HTMLElement,
	{
		scrollTime,
		scrollToNow,
		axis,
	}: { scrollTime?: string; scrollToNow: boolean; axis: ScrollToTimeAxis }
): boolean => {
	const scrollTarget =
		(scrollToNow ? findNowTarget(viewport) : null) ??
		findScrollTimeTarget(viewport, scrollTime)
	if (scrollTarget) {
		const targetRect = scrollTarget.target.getBoundingClientRect()
		const firstRect = scrollTarget.origin.getBoundingClientRect()
		const offset =
			axis === 'horizontal'
				? targetRect.left - firstRect.left
				: targetRect.top - firstRect.top
		const extent = axis === 'horizontal' ? targetRect.width : targetRect.height
		scrollViewportAlong(viewport, axis, offset + scrollTarget.fraction * extent)
		return true
	}
	if (scrollToNow) {
		scrollViewportAlong(viewport, axis, 0)
		return true
	}
	return false
}

export const applyInitialScrollIfNeeded = ({
	viewport,
	lastScrolledKeyRef,
	scrollKey,
	scrollTime,
	scrollToNow,
	axis,
	enabled,
}: {
	viewport: HTMLElement | null
	lastScrolledKeyRef: { current: string | null }
	scrollKey: string
	scrollTime?: string
	scrollToNow: boolean
	axis: ScrollToTimeAxis
	enabled: boolean
}): void => {
	if (!enabled || !viewport) return
	const appliedKey = `${scrollKey}|${scrollTime ?? ''}|${String(scrollToNow)}`
	if (lastScrolledKeyRef.current === appliedKey) return
	if (applyScrollToTime(viewport, { scrollTime, scrollToNow, axis })) {
		lastScrolledKeyRef.current = appliedKey
	}
}

export const applyScrollRequestIfNew = ({
	viewport,
	lastRequestRef,
	scrollRequest,
	axis,
	enabled,
}: {
	viewport: HTMLElement | null
	lastRequestRef: { current: ScrollRequest | undefined }
	scrollRequest?: ScrollRequest
	axis: ScrollToTimeAxis
	enabled: boolean
}): void => {
	if (
		!enabled ||
		!viewport ||
		!scrollRequest ||
		scrollRequest === lastRequestRef.current
	) {
		return
	}
	if (
		applyScrollToTime(viewport, {
			scrollTime: scrollRequest.time,
			scrollToNow: false,
			axis,
		})
	) {
		lastRequestRef.current = scrollRequest
	}
}
