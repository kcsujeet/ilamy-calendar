import {
	add,
	type CellInfo,
	diffDayAndTime,
	type EventDropInfo,
	parseDate,
	type Resource,
	toOffsetIso,
	wallClockDiff,
} from '@ilamy/core'
import {
	canCommitEventPlacement,
	canCommitSelection,
	canDragEvent,
	canResizeEvent,
} from './dom-events'
import type { DomCalendarEvent, DomRuntime } from './dom-types'

const DRAG_THRESHOLD_PX = 5
const MINUTES_PER_DAY = 24 * 60
const DEFAULT_SNAP_MINUTES = 30

const resolveSnapMinutes = (
	snapDuration: number | undefined,
	slotDuration: number | undefined
): number => {
	if (snapDuration !== undefined) return snapDuration
	if (slotDuration !== undefined) return slotDuration
	return DEFAULT_SNAP_MINUTES
}

const findCellAtPoint = (x: number, y: number): HTMLElement | null => {
	let stack: Element[]
	if (typeof document.elementsFromPoint === 'function') {
		stack = document.elementsFromPoint(x, y)
	} else {
		const hit = document.elementFromPoint(x, y)
		stack = hit ? [hit] : []
	}
	for (const node of stack) {
		if (node instanceof HTMLElement) {
			const cell = node.closest<HTMLElement>('[data-cell="true"]')
			if (cell) return cell
		}
	}
	return null
}

const cellElementToInfo = (
	cellEl: HTMLElement,
	runtime: DomRuntime
): CellInfo | null => {
	const start = cellEl.dataset.start
	const end = cellEl.dataset.end
	if (!start || !end) return null
	const resId = cellEl.dataset.resourceId
	let resource: Resource | undefined
	if (resId) {
		resource = runtime.controller
			.getState()
			.resources.find((r) => String(r.id) === resId)
	}
	return {
		start,
		end,
		allDay: cellEl.dataset.allDay === 'true',
		resource,
	}
}

const computeMovedBounds = (
	event: DomCalendarEvent,
	targetCell: CellInfo,
	timezone: string
): EventDropInfo | null => {
	const oldStart = parseDate(event.start, timezone)
	const oldEnd = parseDate(event.end, timezone)
	const cellStart = parseDate(targetCell.start, timezone)
	if (!oldStart || !oldEnd || !cellStart) return null

	const durationMinutes = Math.max(
		1,
		Math.round(wallClockDiff(oldEnd, oldStart, 'minute'))
	)
	const nextAllDay = Boolean(targetCell.allDay)
	const nextStart = cellStart
	let nextEnd = add(nextStart, durationMinutes, 'minute')
	if (nextAllDay) {
		const daySpan = Math.max(1, Math.round(durationMinutes / MINUTES_PER_DAY))
		nextEnd = add(nextStart, daySpan, 'day')
	}

	return {
		start: toOffsetIso(nextStart),
		end: toOffsetIso(nextEnd),
		allDay: nextAllDay,
		resourceId: targetCell.resource?.id ?? event.resourceId,
	}
}

const computeResizedBounds = (
	event: DomCalendarEvent,
	edge: 'start' | 'end',
	targetCell: CellInfo,
	timezone: string,
	snapMinutes: number
): EventDropInfo | null => {
	const oldStart = parseDate(event.start, timezone)
	const oldEnd = parseDate(event.end, timezone)
	const targetStart = parseDate(targetCell.start, timezone)
	const targetEnd = parseDate(targetCell.end, timezone)
	if (!oldStart || !oldEnd || !targetStart || !targetEnd) return null

	const minStepMinutes = event.allDay ? MINUTES_PER_DAY : snapMinutes

	if (edge === 'start') {
		const candidate = targetStart
		if (wallClockDiff(oldEnd, candidate, 'minute') < minStepMinutes) {
			return null
		}
		return {
			start: toOffsetIso(candidate),
			end: event.end,
			allDay: Boolean(event.allDay),
			resourceId: event.resourceId,
		}
	}

	const candidate = targetEnd
	if (wallClockDiff(candidate, oldStart, 'minute') < minStepMinutes) {
		return null
	}
	return {
		start: event.start,
		end: toOffsetIso(candidate),
		allDay: Boolean(event.allDay),
		resourceId: event.resourceId,
	}
}

export const attachDomInteractions = (runtime: DomRuntime): (() => void) => {
	const { root } = runtime

	const handlePointerDown = (downEvent: PointerEvent) => {
		if (downEvent.button !== 0) return
		const target = downEvent.target
		if (!(target instanceof HTMLElement)) return

		const resizeHandle = target.closest<HTMLElement>('[data-resize-handle]')
		const eventBar = target.closest<HTMLElement>('[data-event-id]')

		if (resizeHandle && eventBar) {
			startResizeSession(downEvent, resizeHandle, eventBar, runtime)
			return
		}

		if (eventBar) {
			startDragOrClickSession(downEvent, eventBar, runtime)
			return
		}

		const cellEl = target.closest<HTMLElement>('[data-cell="true"]')
		if (cellEl && runtime.getOptions().enableDragToCreate) {
			startCreateDragSession(downEvent, cellEl, runtime)
		}
	}

	root.addEventListener('pointerdown', handlePointerDown)
	return () => {
		root.removeEventListener('pointerdown', handlePointerDown)
	}
}

const findVisibleEvent = (
	runtime: DomRuntime,
	eventId: string | undefined
): DomCalendarEvent | undefined => {
	if (!eventId) {
		return undefined
	}
	return runtime.getVisibleEvents().find((item) => String(item.id) === eventId)
}

const markDropTarget = (
	cellEl: HTMLElement,
	allowed: boolean,
	activeCursor: string
) => {
	let outline = '2px dashed hsl(var(--destructive, 0 84% 60%))'
	let cursor = 'not-allowed'
	if (allowed) {
		outline = '2px solid hsl(var(--primary, 221 83% 53%))'
		cursor = activeCursor
	}
	cellEl.dataset.dropTarget = allowed ? 'valid' : 'invalid'
	cellEl.style.outline = outline
	document.body.style.cursor = cursor
}

const clearDropHighlights = (root: HTMLElement) => {
	const highlighted = root.querySelectorAll<HTMLElement>(
		'[data-drop-target], [data-select-range]'
	)
	for (const node of highlighted) {
		delete node.dataset.dropTarget
		delete node.dataset.selectRange
		node.style.outline = ''
	}
}

const startDragOrClickSession = (
	downEvent: PointerEvent,
	eventBar: HTMLElement,
	runtime: DomRuntime
) => {
	const targetEvent = findVisibleEvent(runtime, eventBar.dataset.eventId)
	if (!targetEvent) return

	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const draggable = canDragEvent(targetEvent, options)
	const startX = downEvent.clientX
	const startY = downEvent.clientY
	let dragging = false
	let lastDrop: EventDropInfo | null = null
	let lastAllowed = false

	const evaluateHover = (clientX: number, clientY: number) => {
		clearDropHighlights(runtime.root)
		const cellEl = findCellAtPoint(clientX, clientY)
		const cellInfo = cellEl ? cellElementToInfo(cellEl, runtime) : null
		let drop: EventDropInfo | null = null
		if (cellInfo) {
			drop = computeMovedBounds(targetEvent, cellInfo, state.timezone)
		}
		if (!cellEl || !cellInfo || !drop) {
			lastDrop = null
			return
		}
		lastAllowed = canCommitEventPlacement(
			targetEvent,
			drop,
			options,
			state.timezone,
			cellInfo.resource
		)
		lastDrop = drop
		markDropTarget(cellEl, lastAllowed, 'grabbing')
	}

	const onMove = (moveEvent: PointerEvent) => {
		if (!draggable) return
		const moved = Math.hypot(
			moveEvent.clientX - startX,
			moveEvent.clientY - startY
		)
		if (!dragging && moved < DRAG_THRESHOLD_PX) return
		dragging = true
		eventBar.style.opacity = '0.55'
		evaluateHover(moveEvent.clientX, moveEvent.clientY)
	}

	const cleanup = () => {
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', onCancel)
		eventBar.style.opacity = ''
		document.body.style.cursor = ''
		clearDropHighlights(runtime.root)
	}

	const onCancel = () => {
		cleanup()
	}

	const onUp = () => {
		cleanup()
		if (!dragging) {
			if (!options.disableEventClick) {
				options.onEventClick?.(targetEvent)
				runtime.openEditDialog(targetEvent)
			}
			return
		}
		if (!lastDrop || !lastAllowed) return
		const oldStart = parseDate(targetEvent.start, state.timezone)
		const newStart = parseDate(lastDrop.start, state.timezone)
		const delta =
			oldStart && newStart ? diffDayAndTime(newStart, oldStart) : undefined
		runtime.commitUpdate(
			targetEvent,
			{
				start: lastDrop.start,
				end: lastDrop.end,
				allDay: lastDrop.allDay,
				resourceId: lastDrop.resourceId,
			},
			'this',
			{ delta }
		)
	}

	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('pointercancel', onCancel)
}

const startResizeSession = (
	downEvent: PointerEvent,
	handleEl: HTMLElement,
	eventBar: HTMLElement,
	runtime: DomRuntime
) => {
	downEvent.stopPropagation()
	downEvent.preventDefault()

	const edge = handleEl.dataset.resizeHandle === 'start' ? 'start' : 'end'
	const targetEvent = findVisibleEvent(runtime, eventBar.dataset.eventId)
	if (!targetEvent) return

	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	if (!canResizeEvent(targetEvent, options)) return

	const snapMinutes = resolveSnapMinutes(
		options.snapDuration,
		options.slotDuration
	)
	let lastDrop: EventDropInfo | null = null
	let lastAllowed = false

	const onMove = (moveEvent: PointerEvent) => {
		clearDropHighlights(runtime.root)
		const cellEl = findCellAtPoint(moveEvent.clientX, moveEvent.clientY)
		const cellInfo = cellEl ? cellElementToInfo(cellEl, runtime) : null
		let drop: EventDropInfo | null = null
		if (cellInfo) {
			drop = computeResizedBounds(
				targetEvent,
				edge,
				cellInfo,
				state.timezone,
				snapMinutes
			)
		}
		if (!cellEl || !drop) return

		const resource = state.resources.find(
			(r) => String(r.id) === String(targetEvent.resourceId ?? '')
		)
		lastAllowed = canCommitEventPlacement(
			targetEvent,
			drop,
			options,
			state.timezone,
			resource
		)
		lastDrop = drop
		markDropTarget(cellEl, lastAllowed, 'ns-resize')
	}

	const cleanup = () => {
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', cleanup)
		document.body.style.cursor = ''
		clearDropHighlights(runtime.root)
	}

	const onUp = () => {
		cleanup()
		if (!lastDrop || !lastAllowed) return
		const oldStart = parseDate(targetEvent.start, state.timezone)
		const newStart = parseDate(lastDrop.start, state.timezone)
		const oldEnd = parseDate(targetEvent.end, state.timezone)
		const newEnd = parseDate(lastDrop.end, state.timezone)
		let delta: ReturnType<typeof diffDayAndTime> | undefined
		if (edge === 'start' && oldStart && newStart) {
			delta = diffDayAndTime(newStart, oldStart)
		}
		let endDelta: ReturnType<typeof diffDayAndTime> | undefined
		if (edge === 'end' && oldEnd && newEnd) {
			endDelta = diffDayAndTime(newEnd, oldEnd)
		}

		runtime.commitUpdate(
			targetEvent,
			{ start: lastDrop.start, end: lastDrop.end },
			'this',
			{ delta, endDelta }
		)
	}

	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('pointercancel', cleanup)
}

const startCreateDragSession = (
	downEvent: PointerEvent,
	originCellEl: HTMLElement,
	runtime: DomRuntime
) => {
	const originCell = cellElementToInfo(originCellEl, runtime)
	if (!originCell) return
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const startX = downEvent.clientX
	const startY = downEvent.clientY
	let dragging = false
	let currentEndCell: CellInfo = originCell

	const onMove = (moveEvent: PointerEvent) => {
		if (
			!dragging &&
			Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <
				DRAG_THRESHOLD_PX
		) {
			return
		}
		dragging = true
		clearDropHighlights(runtime.root)
		const overCellEl = findCellAtPoint(moveEvent.clientX, moveEvent.clientY)
		if (!overCellEl) return
		const overInfo = cellElementToInfo(overCellEl, runtime)
		if (!overInfo) return
		currentEndCell = overInfo
		originCellEl.dataset.selectRange = 'true'
		overCellEl.dataset.selectRange = 'true'
		overCellEl.style.outline = '2px solid hsl(var(--primary, 221 83% 53%))'
	}

	const cleanup = () => {
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', cleanup)
		clearDropHighlights(runtime.root)
	}

	const onUp = () => {
		cleanup()
		if (!dragging) return
		let startIso = currentEndCell.start
		if (originCell.start <= currentEndCell.start) {
			startIso = originCell.start
		}
		let endIso = currentEndCell.end
		if (originCell.end >= currentEndCell.end) {
			endIso = originCell.end
		}
		const selection: CellInfo = {
			start: startIso,
			end: endIso,
			allDay: originCell.allDay,
			resource: originCell.resource,
		}
		if (!canCommitSelection(selection, options, state.timezone)) return
		options.onRangeSelect?.(selection)
		runtime.openCreateDialog(selection)
	}

	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('pointercancel', cleanup)
}
