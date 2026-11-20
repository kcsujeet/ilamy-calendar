import {
	add,
	type CellInfo,
	diffDayAndTime,
	type EventDropInfo,
	parseDate,
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

const findCellAtPoint = (x: number, y: number): HTMLElement | null => {
	const stack =
		typeof document.elementsFromPoint === 'function'
			? document.elementsFromPoint(x, y)
			: [document.elementFromPoint(x, y)].filter(Boolean)
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
	const resource = resId
		? runtime.controller
				.getState()
				.resources.find((r) => String(r.id) === resId)
		: undefined
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
	const nextEnd = nextAllDay
		? add(nextStart, Math.max(1, Math.round(durationMinutes / 1440)), 'day')
		: add(nextStart, durationMinutes, 'minute')

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

	const minStepMinutes = event.allDay ? 1440 : snapMinutes

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
): DomCalendarEvent | undefined =>
	eventId
		? runtime.getVisibleEvents().find((item) => String(item.id) === eventId)
		: undefined

const markDropTarget = (
	cellEl: HTMLElement,
	allowed: boolean,
	activeCursor: string
) => {
	cellEl.dataset.dropTarget = allowed ? 'valid' : 'invalid'
	cellEl.style.outline = allowed
		? '2px solid hsl(var(--primary, 221 83% 53%))'
		: '2px dashed hsl(var(--destructive, 0 84% 60%))'
	document.body.style.cursor = allowed ? activeCursor : 'not-allowed'
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
		const drop = cellInfo
			? computeMovedBounds(targetEvent, cellInfo, state.timezone)
			: null
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

	const snapMinutes = options.snapDuration ?? options.slotDuration ?? 30
	let lastDrop: EventDropInfo | null = null
	let lastAllowed = false

	const onMove = (moveEvent: PointerEvent) => {
		clearDropHighlights(runtime.root)
		const cellEl = findCellAtPoint(moveEvent.clientX, moveEvent.clientY)
		const cellInfo = cellEl ? cellElementToInfo(cellEl, runtime) : null
		const drop = cellInfo
			? computeResizedBounds(
					targetEvent,
					edge,
					cellInfo,
					state.timezone,
					snapMinutes
				)
			: null
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
		const delta =
			edge === 'start' && oldStart && newStart
				? diffDayAndTime(newStart, oldStart)
				: undefined
		const endDelta =
			edge === 'end' && oldEnd && newEnd
				? diffDayAndTime(newEnd, oldEnd)
				: undefined

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
		const startIso =
			originCell.start <= currentEndCell.start
				? originCell.start
				: currentEndCell.start
		const endIso =
			originCell.end >= currentEndCell.end ? originCell.end : currentEndCell.end
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
