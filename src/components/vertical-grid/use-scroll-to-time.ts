import { type RefObject, useEffect, useRef } from 'react'

export type ScrollToTimeAxis = 'vertical' | 'horizontal'

export interface UseScrollToTimeOptions {
	/**
	 * Ref to the actual scrolling element (e.g. the Radix ScrollArea viewport).
	 * The hook scrolls this element directly so the parent page is not affected.
	 */
	viewportRef: RefObject<HTMLElement | null>
	scrollTime?: string
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

const parseHour = (time: string): number | null => {
	const match = HOUR_PATTERN.exec(time)
	if (!match) {
		return null
	}
	const hour = Number.parseInt(match[1], 10)
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

	if (axis === 'horizontal') {
		viewport.scrollTo({
			left: targetRect.left - firstRect.left,
			behavior: 'auto',
		})
		return
	}

	viewport.scrollTo({
		top: targetRect.top - firstRect.top,
		behavior: 'auto',
	})
}

export const useScrollToTime = ({
	viewportRef,
	scrollTime,
	enabled,
	scrollKey,
	axis = 'vertical',
}: UseScrollToTimeOptions) => {
	const lastScrolledKeyRef = useRef<string | null>(null)

	useEffect(() => {
		if (!enabled || !scrollTime) {
			return
		}
		if (lastScrolledKeyRef.current === scrollKey) {
			return
		}

		const targetHour = parseHour(scrollTime)
		if (targetHour === null) {
			return
		}

		const viewport = viewportRef.current
		if (!viewport) {
			return
		}
		const rows = Array.from(
			viewport.querySelectorAll<HTMLElement>(HOUR_SELECTOR)
		)
		const firstRow = rows.at(0)
		const targetRow = findTargetRow(rows, targetHour)
		if (!firstRow || !targetRow) {
			return
		}
		scrollViewportToRow(viewport, targetRow, firstRow, axis)
		lastScrolledKeyRef.current = scrollKey
	}, [enabled, scrollTime, scrollKey, viewportRef, axis])
}
