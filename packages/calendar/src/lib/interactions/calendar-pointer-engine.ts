import type {
	CalendarEvent,
	CellInfo,
	EventDelta,
	EventDropInfo,
	Resource,
} from '../../types/calendar.types'
import { resolveSnapDuration, type TimeAxis } from '../../utils/helpers'
import {
	diffDayAndTime,
	elapsedDiff,
	parseDate,
	startOf,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '../../utils/temporal'
import {
	cellElementAt,
	computeSelectionRange,
	getCellBounds,
	isSameRegion,
	readCell,
	type SnappedCell,
	snapCellToPoint,
} from './cell-hit-test.utils'
import {
	type ConstraintCheckOptions,
	calculateMovePlacement,
	calculateResizePlacement,
	canDragEvent,
	canResizeEvent,
	computeGrabOffset,
	type DragSegment,
	type GrabOffset,
	getDragSegment,
	getPressedResizeEdge,
	isPlacementAllowed,
	isSelectionAllowed,
	NO_GRAB_OFFSET,
	type PlacementCell,
	type ResizeEdge,
} from './event-placement.utils'
import {
	createPointerGesture,
	type PointerGestureHandle,
} from './pointer-gesture'
import type { PointerPoint, Rect } from './rect.utils'

/** Active pointer interaction mode. */
export type InteractionMode = 'move' | 'resize' | 'select'

/** Live preview emitted during drag, resize, or range selection. */
export interface InteractionPreview {
	mode: InteractionMode
	eventId?: string | number
	cellEl: HTMLElement
	allowed: boolean
	cursor: string
	bounds?: Rect
	start?: ZonedDate
	end?: ZonedDate
	allDay?: boolean
	resourceId?: string | number
}

/** Runtime calendar state queried during pointer interactions. */
export interface CalendarInteractionState extends ConstraintCheckOptions {
	events: CalendarEvent[]
	resources: Resource[]
	timezone: string
	hiddenDays?: Set<number>
	enableDragToCreate?: boolean
	eventResizableFromStart?: boolean
	slotDurationMinutes?: number
	snapDurationMinutes?: number
	scrollAxis?: 'x' | 'y' | 'both'
}

/** Configuration passed to `attachCalendarInteractions`. */
export interface CalendarInteractionConfig {
	root: HTMLElement
	getState: () => CalendarInteractionState
	resolveEvent?: (eventId: string) => CalendarEvent | undefined
	onEventClick?: (event: CalendarEvent) => void
	onPreviewChange?: (preview: InteractionPreview | null) => void
	onSelectionChange?: (
		selection: { startCell: SnappedCell; endCell: SnappedCell } | null
	) => void
	onMoveCommit?: (
		event: CalendarEvent,
		placement: EventDropInfo,
		info: { delta?: EventDelta; endDelta?: EventDelta }
	) => void
	onResizeCommit?: (
		event: CalendarEvent,
		placement: EventDropInfo,
		info: { delta?: EventDelta; endDelta?: EventDelta }
	) => void
	onRangeSelect?: (selection: CellInfo) => void
}

/** Handle returned by `attachCalendarInteractions`. */
export interface CalendarInteractionHandle {
	destroy: () => void
}

type ActivePayload =
	| {
			mode: 'resize'
			event: CalendarEvent
			edge: ResizeEdge
	  }
	| {
			mode: 'move'
			event: CalendarEvent
			barEl: HTMLElement
			grabOffset: GrabOffset
	  }
	| {
			mode: 'select'
			startCell: SnappedCell
	  }

const MOVE_THRESHOLD_PX = 5
const SELECT_THRESHOLD_PX = 2
const RESIZE_THRESHOLD_PX = 5
const MINUTES_PER_HOUR = 60

const findResourceById = (
	resources: Resource[],
	id: string | number | undefined
): Resource | undefined => {
	if (id === undefined) return undefined
	return resources.find((item) => String(item.id) === String(id))
}

const snappedCellToPlacementCell = (
	cell: SnappedCell,
	state: CalendarInteractionState
): PlacementCell => {
	const hasTimeAxis = cell.axis !== undefined && !cell.allDay
	return {
		date: cell.start,
		hour: hasTimeAxis ? cell.start.hour : undefined,
		minute: hasTimeAxis ? cell.start.minute : undefined,
		slotDurationMinutes: hasTimeAxis
			? Math.max(1, elapsedDiff(cell.end, cell.start, 'minute'))
			: state.slotDurationMinutes,
		snapMinutes: cell.snapMinutes ?? state.snapDurationMinutes,
		axis: cell.axis,
		allDay: cell.allDay,
		isAllDaySlot: cell.isAllDaySlot,
		resourceId: cell.resourceId,
	}
}

const resolvePlacementResourceId = (
	rawId: string | undefined,
	resources: Resource[]
): string | number | undefined =>
	rawId === undefined
		? undefined
		: (findResourceById(resources, rawId)?.id ?? rawId)

const resolveDragAxis = (
	barEl: HTMLElement,
	event: CalendarEvent
): TimeAxis => {
	const axisAttr = barEl.dataset.dragAxis
	if (axisAttr === 'horizontal' || axisAttr === 'vertical') return axisAttr
	return event.allDay ? 'horizontal' : 'vertical'
}

const resolveDragSlotMinutes = (
	axis: TimeAxis,
	state: CalendarInteractionState
): number => {
	if (axis !== 'vertical') return MINUTES_PER_HOUR
	return (
		state.snapDurationMinutes ?? state.slotDurationMinutes ?? MINUTES_PER_HOUR
	)
}

const resolveSegmentBound = (
	iso: string | undefined,
	fallback: ZonedDate,
	timezone: string
): ZonedDate => (iso ? parseDate(iso, timezone) : undefined) ?? fallback

const buildGrabOffset = (
	event: CalendarEvent,
	barEl: HTMLElement,
	press: PointerEvent,
	state: CalendarInteractionState
): GrabOffset => {
	const start = parseDate(event.start, state.timezone)
	const end = parseDate(event.end, state.timezone)
	if (!(start && end)) return NO_GRAB_OFFSET
	const axis = resolveDragAxis(barEl, event)
	const segStart = resolveSegmentBound(
		barEl.dataset.segStart,
		start,
		state.timezone
	)
	const segEnd = resolveSegmentBound(barEl.dataset.segEnd, end, state.timezone)
	const segment: DragSegment = getDragSegment(
		event,
		{ start: segStart, end: segEnd },
		axis,
		state.hiddenDays
	) ?? { start, end, axis, hiddenDays: state.hiddenDays }
	return computeGrabOffset({
		activeEvent: event,
		initialRect: barEl.getBoundingClientRect(),
		pointer: { x: press.clientX, y: press.clientY },
		segment,
		slotDurationMinutes: resolveDragSlotMinutes(axis, state),
	})
}

const ZERO_DELTA: EventDelta = { days: 0, milliseconds: 0 }

const computeEventDeltas = (
	event: CalendarEvent,
	nextStart: ZonedDate,
	nextEnd: ZonedDate,
	allDayDrop: boolean | undefined,
	timezone: string
): { delta?: EventDelta; endDelta?: EventDelta } => {
	const prevStart = parseDate(event.start, timezone)
	const prevEnd = parseDate(event.end, timezone)
	const deltaFromStart =
		prevStart && allDayDrop && !event.allDay
			? startOf(prevStart, 'day')
			: prevStart
	const delta = deltaFromStart
		? diffDayAndTime(deltaFromStart, nextStart)
		: undefined
	const endDelta = prevEnd ? diffDayAndTime(prevEnd, nextEnd) : undefined
	return { delta, endDelta }
}

const timestampsDiffer = (a: string, b: string, timezone: string): boolean => {
	const left = parseDate(a, timezone)
	const right = parseDate(b, timezone)
	if (!(left && right)) return true
	return left.epochMilliseconds !== right.epochMilliseconds
}

const isDropChanged = (
	event: CalendarEvent,
	drop: EventDropInfo,
	timezone: string
): boolean =>
	timestampsDiffer(event.start, drop.start, timezone) ||
	timestampsDiffer(event.end, drop.end, timezone) ||
	Boolean(drop.allDay) !== Boolean(event.allDay) ||
	String(drop.resourceId ?? '') !== String(event.resourceId ?? '')

/**
 * Attaches a single unified pointer interaction engine (event move, resize, click,
 * and drag-to-create selection) to a calendar container element.
 */
export const attachCalendarInteractions = (
	config: CalendarInteractionConfig
): CalendarInteractionHandle => {
	let lastDrop: EventDropInfo | null = null
	let lastAllowed = false
	let lastEndCell: SnappedCell | null = null
	let previousBodyCursor = ''
	let hasLockedCursor = false

	const setCursor = (cursor: string) => {
		if (!hasLockedCursor) {
			previousBodyCursor = document.body.style.cursor
			hasLockedCursor = true
		}
		document.body.style.cursor = cursor
	}

	const restoreCursor = () => {
		if (hasLockedCursor) {
			document.body.style.cursor = previousBodyCursor
			hasLockedCursor = false
		}
	}

	const clearSessionState = () => {
		lastDrop = null
		lastAllowed = false
		lastEndCell = null
		restoreCursor()
		config.onPreviewChange?.(null)
		config.onSelectionChange?.(null)
	}

	const readSnappedAt = (
		el: Element | null,
		point: PointerPoint,
		state: CalendarInteractionState
	): SnappedCell | null => {
		const raw = readCell(el, state.timezone)
		if (!raw) return null
		if (
			raw.axis &&
			raw.snapMinutes === undefined &&
			state.snapDurationMinutes
		) {
			const cellMinutes = Math.max(1, elapsedDiff(raw.end, raw.start, 'minute'))
			const effectiveSnap = resolveSnapDuration(
				state.snapDurationMinutes,
				cellMinutes
			)
			if (effectiveSnap < cellMinutes) {
				raw.snapMinutes = effectiveSnap
			}
		}
		return snapCellToPoint(raw, point)
	}

	const resolveEventById = (
		eventId: string | undefined,
		state: CalendarInteractionState
	): CalendarEvent | undefined => {
		if (!eventId) return undefined
		return (
			config.resolveEvent?.(eventId) ??
			state.events.find((item) => String(item.id) === eventId)
		)
	}

	const evaluateMove = (
		payload: Extract<ActivePayload, { mode: 'move' }>,
		point: PointerPoint,
		state: CalendarInteractionState
	) => {
		const cellEl = cellElementAt(point)
		const snapped = readSnappedAt(cellEl, point, state)
		if (!(cellEl instanceof HTMLElement && snapped)) {
			lastDrop = null
			lastAllowed = false
			config.onPreviewChange?.(null)
			return
		}
		const targetResourceId = resolvePlacementResourceId(
			snapped.resourceId,
			state.resources
		)
		const cell = snappedCellToPlacementCell(snapped, state)
		const { start, end, allDay } = calculateMovePlacement(
			payload.event,
			cell,
			payload.grabOffset
		)
		const dropInfo: EventDropInfo = {
			start: toOffsetIso(start),
			end: toOffsetIso(end),
			allDay,
			resourceId: targetResourceId ?? payload.event.resourceId,
		}
		const targetResource = findResourceById(
			state.resources,
			dropInfo.resourceId
		)
		const allowed = isPlacementAllowed(
			payload.event,
			dropInfo,
			state,
			state.timezone,
			targetResource
		)
		lastDrop = dropInfo
		lastAllowed = allowed
		const cursor = allowed ? 'grabbing' : 'not-allowed'
		setCursor(cursor)
		config.onPreviewChange?.({
			mode: 'move',
			eventId: payload.event.id,
			cellEl,
			allowed,
			cursor,
			bounds: getCellBounds(snapped),
			start,
			end,
			allDay,
			resourceId: dropInfo.resourceId,
		})
	}

	const clearResizePreview = () => {
		lastDrop = null
		lastAllowed = false
		restoreCursor()
		config.onPreviewChange?.(null)
	}

	const applyResizeCursor = (
		allowed: boolean,
		axis: TimeAxis | undefined
	): 'ew-resize' | 'ns-resize' | 'not-allowed' => {
		const resizeCursor = axis === 'horizontal' ? 'ew-resize' : 'ns-resize'
		if (!allowed) {
			setCursor('not-allowed')
			return 'not-allowed'
		}
		restoreCursor()
		return resizeCursor
	}

	const evaluateResize = (
		payload: Extract<ActivePayload, { mode: 'resize' }>,
		point: PointerPoint,
		state: CalendarInteractionState
	) => {
		const cellEl = cellElementAt(point)
		const snapped = readSnappedAt(cellEl, point, state)
		if (!(cellEl instanceof HTMLElement && snapped)) return
		const inSameComponent = payload.event.allDay
			? snapped.allDay
			: !snapped.isAllDaySlot
		if (!inSameComponent) {
			clearResizePreview()
			return
		}
		const cell = snappedCellToPlacementCell(snapped, state)
		const next = calculateResizePlacement(payload.event, cell, payload.edge, {
			resizableFromStart: Boolean(state.eventResizableFromStart),
		})
		if (!next) {
			clearResizePreview()
			return
		}
		const dropInfo: EventDropInfo = {
			start: toOffsetIso(next.start),
			end: toOffsetIso(next.end),
			allDay: Boolean(payload.event.allDay),
			resourceId: payload.event.resourceId,
		}
		const ownResource = findResourceById(
			state.resources,
			payload.event.resourceId
		)
		const allowed = isPlacementAllowed(
			payload.event,
			dropInfo,
			state,
			state.timezone,
			ownResource
		)
		lastDrop = dropInfo
		lastAllowed = allowed
		const cursor = applyResizeCursor(allowed, cell.axis)
		config.onPreviewChange?.({
			mode: 'resize',
			eventId: payload.event.id,
			cellEl,
			allowed,
			cursor,
			bounds: getCellBounds(snapped),
			start: next.start,
			end: next.end,
			allDay: dropInfo.allDay,
			resourceId: dropInfo.resourceId,
		})
	}

	const evaluateSelection = (
		payload: Extract<ActivePayload, { mode: 'select' }>,
		point: PointerPoint,
		state: CalendarInteractionState
	) => {
		const cellEl = cellElementAt(point)
		const candidate = readSnappedAt(cellEl, point, state)
		if (candidate && isSameRegion(payload.startCell, candidate)) {
			const range = computeSelectionRange(payload.startCell, candidate)
			const resource = findResourceById(state.resources, range.resourceId)
			const selectionInfo: CellInfo = {
				start: toOffsetIso(range.start),
				end: toOffsetIso(range.end),
				allDay: range.allDay,
				resource,
			}
			if (isSelectionAllowed(selectionInfo, state, state.timezone)) {
				lastEndCell = candidate
			}
		}
		config.onSelectionChange?.({
			startCell: payload.startCell,
			endCell: lastEndCell ?? payload.startCell,
		})
	}

	const resolveResizePress = (
		downEvent: PointerEvent,
		barEl: HTMLElement,
		state: CalendarInteractionState
	): ActivePayload | null => {
		const edge = getPressedResizeEdge(downEvent)
		const event = resolveEventById(barEl.dataset.eventId, state)
		if (!edge || !event || !canResizeEvent(event, state)) return null
		if (edge === 'start' && state.eventResizableFromStart !== true) return null
		downEvent.stopPropagation()
		return { mode: 'resize', event, edge }
	}

	const resolveBarPress = (
		downEvent: PointerEvent,
		barEl: HTMLElement,
		state: CalendarInteractionState
	): ActivePayload | null => {
		const event = resolveEventById(barEl.dataset.eventId, state)
		if (!event) return null
		const grabOffset = canDragEvent(event, state)
			? buildGrabOffset(event, barEl, downEvent, state)
			: NO_GRAB_OFFSET
		return { mode: 'move', event, barEl, grabOffset }
	}

	const resolveCellPress = (
		target: Element,
		downEvent: PointerEvent,
		state: CalendarInteractionState
	): ActivePayload | null => {
		if (!state.enableDragToCreate) return null
		const startCell = readSnappedAt(
			target,
			{ clientX: downEvent.clientX, clientY: downEvent.clientY },
			state
		)
		if (!startCell) return null
		const cellInfo: CellInfo = {
			start: toOffsetIso(startCell.start),
			end: toOffsetIso(startCell.end),
			allDay: startCell.allDay,
			resource: findResourceById(state.resources, startCell.resourceId),
		}
		if (!isSelectionAllowed(cellInfo, state, state.timezone)) return null
		return { mode: 'select', startCell }
	}

	const commitSelection = (
		payload: Extract<ActivePayload, { mode: 'select' }>,
		endCell: SnappedCell | null,
		state: CalendarInteractionState
	) => {
		const selectionEnd = endCell ?? payload.startCell
		const range = computeSelectionRange(payload.startCell, selectionEnd)
		const selection: CellInfo = {
			start: toOffsetIso(range.start),
			end: toOffsetIso(range.end),
			allDay: range.allDay,
			resource: findResourceById(state.resources, range.resourceId),
		}
		const nonEmpty = wallClockDiff(range.end, range.start, 'minute') > 0
		if (nonEmpty && isSelectionAllowed(selection, state, state.timezone)) {
			config.onRangeSelect?.(selection)
		}
	}

	const pickResizeDeltas = (
		edge: 'start' | 'end',
		delta?: EventDelta,
		endDelta?: EventDelta
	) => ({
		delta: edge === 'start' ? (delta ?? ZERO_DELTA) : ZERO_DELTA,
		endDelta: edge === 'end' ? (endDelta ?? ZERO_DELTA) : ZERO_DELTA,
	})

	const commitEventMutation = (
		payload: Exclude<ActivePayload, { mode: 'select' }>,
		drop: EventDropInfo,
		state: CalendarInteractionState
	) => {
		if (!isDropChanged(payload.event, drop, state.timezone)) return
		const nextStart = parseDate(drop.start, state.timezone)
		const nextEnd = parseDate(drop.end, state.timezone)
		if (!(nextStart && nextEnd)) return
		const { delta, endDelta } = computeEventDeltas(
			payload.event,
			nextStart,
			nextEnd,
			drop.allDay,
			state.timezone
		)
		if (payload.mode === 'move') {
			config.onMoveCommit?.(payload.event, drop, { delta, endDelta })
			return
		}
		config.onResizeCommit?.(
			payload.event,
			drop,
			pickResizeDeltas(payload.edge, delta, endDelta)
		)
	}

	const gesture: PointerGestureHandle<ActivePayload> =
		createPointerGesture<ActivePayload>({
			target: config.root,
			getThresholdPx: (payload) => {
				if (payload.mode === 'resize') return RESIZE_THRESHOLD_PX
				if (payload.mode === 'move') return MOVE_THRESHOLD_PX
				return SELECT_THRESHOLD_PX
			},
			getScrollAxis: () => config.getState().scrollAxis ?? 'both',
			resolvePress: (downEvent) => {
				const target = downEvent.target
				if (!(target instanceof Element)) return null
				const state = config.getState()
				const handleEl =
					downEvent.pointerType === 'touch'
						? null
						: target.closest<HTMLElement>('[data-resize-handle]')
				const barEl = target.closest<HTMLElement>('[data-event-id]')
				if (handleEl && barEl)
					return resolveResizePress(downEvent, barEl, state)
				if (barEl) return resolveBarPress(downEvent, barEl, state)
				return resolveCellPress(target, downEvent, state)
			},
			onStart: (payload) => {
				lastDrop = null
				lastAllowed = false
				if (payload.mode === 'select') {
					lastEndCell = payload.startCell
					config.onSelectionChange?.({
						startCell: payload.startCell,
						endCell: payload.startCell,
					})
					return
				}
				const curState = config.getState()
				const allowed =
					payload.mode === 'resize'
						? canResizeEvent(payload.event, curState)
						: canDragEvent(payload.event, curState)
				if (!allowed) {
					gesture.cancel()
				}
			},
			onMove: (point, payload) => {
				const state = config.getState()
				if (payload.mode === 'move') {
					if (canDragEvent(payload.event, state))
						evaluateMove(payload, point, state)
					return
				}
				if (payload.mode === 'resize') {
					evaluateResize(payload, point, state)
					return
				}
				evaluateSelection(payload, point, state)
			},
			onTap: (payload, _event, moved) => {
				if (payload.mode === 'move') {
					config.onEventClick?.(payload.event)
				} else if (payload.mode === 'resize' && !moved) {
					config.onEventClick?.(payload.event)
				}
			},
			onEnd: (payload) => {
				const state = config.getState()
				const drop = lastDrop
				const allowed = lastAllowed
				const endCell = lastEndCell
				clearSessionState()
				if (payload.mode === 'select') {
					commitSelection(payload, endCell, state)
					return
				}
				if (drop && allowed) {
					commitEventMutation(payload, drop, state)
				}
			},
			onCancel: clearSessionState,
		})

	return {
		destroy: () => {
			gesture.destroy()
			clearSessionState()
		},
	}
}
