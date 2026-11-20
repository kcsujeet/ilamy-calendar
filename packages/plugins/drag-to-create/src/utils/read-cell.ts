import type { TimeAxis } from '@ilamy/utils/helpers'
import { parseDate, resolveZone, type ZonedDate } from '@ilamy/utils/temporal'

export interface RawCell {
	start: ZonedDate
	end: ZonedDate
	resourceId?: string
	allDay: boolean
	snapMinutes?: number
	axis?: TimeAxis
	element: HTMLElement
}

export const cellElementAt = (point: {
	clientX: number
	clientY: number
}): Element | null => {
	const stack = document.elementsFromPoint(point.clientX, point.clientY)
	return stack.find((element) => element.hasAttribute('data-start')) ?? null
}

export const readCell = (
	el: Element | null | undefined,
	timezone?: string
): RawCell | null => {
	const cell = el?.closest<HTMLElement>('[data-start]')
	if (!cell) {
		return null
	}
	if (cell.dataset.disabled === 'true') {
		return null
	}
	const startIso = cell.dataset.start
	const endIso = cell.dataset.end
	if (!startIso || !endIso) {
		return null
	}
	const zone = resolveZone(timezone)
	const start = parseDate(startIso, zone)
	const end = parseDate(endIso, zone)
	if (!(start && end)) {
		return null
	}
	const snapMinutes = cell.dataset.snapMinutes
	const axis = cell.dataset.timeAxis
	return {
		start,
		end,
		resourceId: cell.dataset.resourceId,
		allDay: cell.dataset.allDay === 'true',
		snapMinutes: snapMinutes === undefined ? undefined : Number(snapMinutes),
		axis: axis === 'vertical' || axis === 'horizontal' ? axis : undefined,
		element: cell,
	}
}
