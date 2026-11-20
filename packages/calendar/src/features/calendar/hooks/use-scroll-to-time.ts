import {
	elapsedDiff,
	now,
	overlapsRange,
	parseDate,
	type ZonedInterval,
} from '@ilamy/utils/temporal'
import { type RefObject, useEffect, useRef } from 'react'
import type { ScrollRequest } from '@/features/calendar/stores/calendar-context/calendar-context'

type ScrollToTimeAxis = 'vertical' | 'horizontal'

interface UseScrollToTimeOptions {
	viewportRef: RefObject<HTMLElement | null>
	scrollTime?: string
	scrollToNow?: boolean
	scrollRequest?: ScrollRequest
	enabled: boolean
	scrollKey: string
	axis?: ScrollToTimeAxis
}

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

const parseTime = (time: string): ParsedTime | null => {
	const match = TIME_PATTERN.exec(time)
	const hourDigits = match?.at(1)
	if (!hourDigits) {
		return null
	}
	const hour = Number.parseInt(hourDigits, 10)
	const minute = Number.parseInt(match?.at(2) ?? '0', 10)
	const second = Number.parseInt(match?.at(3) ?? '0', 10)
	const isInRange = hour <= 23 && minute <= 59 && second <= 59
	if (!isInRange) {
		return null
	}
	const secondsIntoHour = minute * 60 + second
	return { hour, hourFraction: secondsIntoHour / SECONDS_PER_HOUR }
}

const readRowHour = (row: HTMLElement): number =>
	Number.parseInt(row.getAttribute('data-hour') ?? '', 10)

const firstDayRows = (rows: HTMLElement[]): HTMLElement[] => {
	const firstDayEnd = rows.findIndex((row, index) => {
		const previousRow = rows.at(index - 1)
		const isFirstRow = index === 0 || previousRow === undefined
		return !isFirstRow && readRowHour(row) <= readRowHour(previousRow)
	})
	return firstDayEnd === -1 ? rows : rows.slice(0, firstDayEnd)
}

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
	origin: HTMLElement
	fraction: number
}

const readCellInterval = (cell: HTMLElement): ZonedInterval | null => {
	const start = parseDate(cell.dataset.start, 'UTC')
	const end = parseDate(cell.dataset.end, 'UTC')
	if (!start || !end) {
		return null
	}
	return { start, end }
}

const findNowTarget = (viewport: HTMLElement): ScrollTarget | null => {
	// Prefer timed cells so time grids skip their sticky all-day row; fall back
	// to all-day cells for day-only grids (e.g. resource month, D11).
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
	if (!origin || !target) {
		return null
	}
	const interval = readCellInterval(target)
	if (!interval) {
		return null
	}
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
	const parsed = scrollTime ? parseTime(scrollTime) : null
	if (parsed === null) {
		return null
	}
	const rows = firstDayRows(
		Array.from(viewport.querySelectorAll<HTMLElement>(HOUR_SELECTOR))
	)
	const origin = rows.at(0)
	const target = findTargetRow(rows, parsed.hour)
	if (!origin || !target) {
		return null
	}
	const isTargetHourVisible = readRowHour(target) === parsed.hour
	const fraction = isTargetHourVisible ? parsed.hourFraction : 0
	return { target, origin, fraction }
}

const scrollViewportAlong = (
	viewport: HTMLElement,
	axis: ScrollToTimeAxis,
	offset: number
) => {
	const edge = axis === 'horizontal' ? 'left' : 'top'
	viewport.scrollTo({ [edge]: offset, behavior: 'auto' })
}

const scrollViewportToRow = (
	viewport: HTMLElement,
	targetRow: HTMLElement,
	firstRow: HTMLElement,
	fraction: number,
	axis: ScrollToTimeAxis
) => {
	const targetRect = targetRow.getBoundingClientRect()
	const firstRect = firstRow.getBoundingClientRect()
	const offset =
		axis === 'horizontal'
			? targetRect.left - firstRect.left
			: targetRect.top - firstRect.top
	const extent = axis === 'horizontal' ? targetRect.width : targetRect.height
	scrollViewportAlong(viewport, axis, offset + fraction * extent)
}

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
			scrollTarget.fraction,
			axis
		)
		return true
	}
	if (scrollToNow) {
		scrollViewportAlong(viewport, axis, 0)
		return true
	}
	return false
}

export const useScrollToTime = ({
	viewportRef,
	scrollTime,
	scrollToNow = false,
	scrollRequest,
	enabled,
	scrollKey,
	axis = 'vertical',
}: UseScrollToTimeOptions) => {
	const lastScrolledKeyRef = useRef<string | null>(null)

	useEffect(() => {
		if (!enabled) {
			return
		}
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

	const lastRequestRef = useRef(scrollRequest)

	useEffect(() => {
		const viewport = viewportRef.current
		const isNewRequest = scrollRequest !== lastRequestRef.current
		if (!enabled || !viewport || !scrollRequest || !isNewRequest) {
			return
		}
		const didScroll = applyScroll(viewport, {
			scrollTime: scrollRequest.time,
			scrollToNow: false,
			axis,
		})
		if (didScroll) {
			lastRequestRef.current = scrollRequest
		}
	}, [enabled, scrollRequest, viewportRef, axis])
}
