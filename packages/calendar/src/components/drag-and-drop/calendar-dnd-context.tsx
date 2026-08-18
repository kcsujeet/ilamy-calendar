import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import {
	DndContext,
	MouseSensor,
	pointerWithin,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { createPortal } from 'react-dom'
import { EventMutationScopeSlot } from '@/components/calendar-slots'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type {
	DragSnapInterval,
	RenderDragTimeIndicatorProps,
} from '@/features/calendar/types'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'
import type { CalendarView, TimeFormat } from '@/types'
import { getUpdatedEvent } from './dnd-utils'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

interface ActiveDragData {
	type?: string
	event?: CalendarEvent
	timeAxis?: 'vertical' | 'horizontal'
	presentation?: {
		className?: string
		style?: React.CSSProperties
		isTruncatedStart?: boolean
		isTruncatedEnd?: boolean
	}
}

interface DragIndicatorState {
	selectedTime: Dayjs
	rangeStart: Dayjs
	rangeEnd: Dayjs
	progress: number
	axis: 'vertical' | 'horizontal'
	resource?: Resource
	left: number
	top: number
	width: number
	height: number
}

type TimeAxis = 'vertical' | 'horizontal'

interface DragGrabOffset {
	axis: TimeAxis
	offset: number
}

interface DragVisualState {
	activeEvent: CalendarEvent | null
	presentation?: ActiveDragData['presentation']
	size?: { width: number; height: number }
	sourcePosition?: { left: number; top: number }
	indicator: DragIndicatorState | null
	snapTarget?: { axis: 'vertical' | 'horizontal'; coordinate: number }
}

const EMPTY_DRAG_VISUAL: DragVisualState = {
	activeEvent: null,
	indicator: null,
}

// Geometry resolution deliberately keeps validation beside its coordinate math.
// fallow-ignore-next-line complexity
const resolveTimedDrag = ({
	event,
	activeEvent,
	pointer,
	grabOffset,
	dragSnapInterval,
	timezone,
	getResourceById,
	queryRoot,
}: {
	event: Pick<DragMoveEvent, 'active' | 'over'>
	activeEvent: CalendarEvent
	pointer: { x: number; y: number }
	grabOffset: DragGrabOffset | null
	dragSnapInterval: DragSnapInterval
	timezone?: string
	getResourceById: (
		resourceId: string | number | undefined
	) => Resource | undefined
	queryRoot: ParentNode
}) => {
	const allCells = Array.from(
		queryRoot.querySelectorAll<HTMLElement>('[data-dnd-lane][data-dnd-axis]')
	).flatMap((cell) => {
		const axis = cell.dataset.dndAxis
		const laneId = cell.dataset.dndLane
		const hasValidAxis = axis === 'vertical' || axis === 'horizontal'
		if (!hasValidAxis || !laneId) {
			return []
		}
		return [
			{
				axis: axis as 'vertical' | 'horizontal',
				cell,
				laneId,
				rect: cell.getBoundingClientRect(),
			},
		]
	})
	const laneRepresentatives = Array.from(
		new Map(
			allCells.map((cell) => [`${cell.axis}:${cell.laneId}`, cell] as const)
		).values()
	)
	const directDestinationCell = allCells.find(({ axis, rect }) => {
		const crossCoordinate = axis === 'vertical' ? pointer.x : pointer.y
		const crossStart = axis === 'vertical' ? rect.left : rect.top
		const crossEnd = axis === 'vertical' ? rect.right : rect.bottom
		const isOnOrAfterStart = crossCoordinate >= crossStart
		const isBeforeEnd = crossCoordinate < crossEnd
		return isOnOrAfterStart && isBeforeEnd
	})
	const gapDestinationCell = (['vertical', 'horizontal'] as const)
		.flatMap((axis) => {
			const axisLanes = laneRepresentatives
				.filter((lane) => lane.axis === axis)
				.sort((a, b) => {
					let difference = a.rect.top - b.rect.top
					if (axis === 'vertical') {
						difference = a.rect.left - b.rect.left
					}
					return difference
				})
			const crossCoordinate = axis === 'vertical' ? pointer.x : pointer.y
			return axisLanes.filter(({ rect }, index) => {
				const crossStart = axis === 'vertical' ? rect.left : rect.top
				let previousRect: DOMRect | undefined
				if (index > 0) {
					previousRect = axisLanes.at(index - 1)?.rect
				}
				if (!previousRect) return false
				let previousEnd = previousRect.bottom
				if (axis === 'vertical') {
					previousEnd = previousRect.right
				}
				const gap = crossStart - previousEnd
				if (gap <= 0 || gap > 1) return false
				if (crossCoordinate < previousEnd) return false
				return crossCoordinate < crossStart
			})
		})
		.at(0)
	const destinationCell = directDestinationCell ?? gapDestinationCell
	if (!destinationCell) {
		return null
	}

	const { axis, laneId } = destinationCell
	const pointerCoordinate = axis === 'vertical' ? pointer.y : pointer.x
	const matchingGrabOffset = grabOffset?.axis === axis ? grabOffset : null
	let leadingCoordinate = pointerCoordinate
	if (!activeEvent.allDay && matchingGrabOffset) {
		leadingCoordinate -= matchingGrabOffset.offset
	}
	const cellsWithRects = allCells
		.filter((cell) => cell.laneId === laneId && cell.axis === axis)
		.sort((a, b) => {
			let difference = a.rect.left - b.rect.left
			if (axis === 'vertical') {
				difference = a.rect.top - b.rect.top
			}
			return difference
		})
	const containingRawCell = cellsWithRects.find(({ rect }, index) => {
		const start = axis === 'vertical' ? rect.top : rect.left
		const end = axis === 'vertical' ? rect.bottom : rect.right
		const isLast = index === cellsWithRects.length - 1
		const isBeforeEnd = leadingCoordinate < end
		const isAtFinalEnd = isLast && leadingCoordinate === end
		const isWithinEnd = isBeforeEnd || isAtFinalEnd
		return leadingCoordinate >= start && isWithinEnd
	})
	const gapRawCell = cellsWithRects.find(({ rect }, index) => {
		let previousRect: DOMRect | undefined
		if (index > 0) {
			previousRect = cellsWithRects.at(index - 1)?.rect
		}
		if (!previousRect) return false
		const start = axis === 'vertical' ? rect.top : rect.left
		let previousEnd = previousRect.right
		if (axis === 'vertical') {
			previousEnd = previousRect.bottom
		}
		const gap = start - previousEnd
		if (gap <= 0 || gap > 1) return false
		if (leadingCoordinate < previousEnd) return false
		return leadingCoordinate < start
	})
	const rawCell = containingRawCell ?? gapRawCell
	if (!rawCell) {
		return null
	}
	const rawStartISO = rawCell.cell.dataset.start
	const rawEndISO = rawCell.cell.dataset.end
	if (!rawStartISO || !rawEndISO) {
		return null
	}
	if (rawCell.cell.dataset.disabled === 'true') {
		return null
	}

	let rawRangeStart = dayjs(rawStartISO)
	let rawRangeEnd = dayjs(rawEndISO)
	if (timezone) {
		rawRangeStart = rawRangeStart.tz(timezone)
		rawRangeEnd = rawRangeEnd.tz(timezone)
	}
	let rawPixelStart = rawCell.rect.left
	let rawPixelSize = rawCell.rect.width
	if (axis === 'vertical') {
		rawPixelStart = rawCell.rect.top
		rawPixelSize = rawCell.rect.height
	}
	const rawProgress = Math.min(
		1,
		Math.max(0, (leadingCoordinate - rawPixelStart) / rawPixelSize)
	)
	const rawDuration = rawRangeEnd.diff(rawRangeStart, 'millisecond')
	const rawStart = rawRangeStart.add(rawDuration * rawProgress, 'millisecond')
	const serializedResourceId = destinationCell.cell.dataset.resourceId
	const stringResource = getResourceById(serializedResourceId)
	const numericResourceId = Number(serializedResourceId)
	let numericResource: Resource | undefined
	if (!Number.isNaN(numericResourceId)) {
		numericResource = getResourceById(numericResourceId)
	}
	const resource = stringResource ?? numericResource
	const resourceId = resource?.id ?? serializedResourceId
	const updatedEvent = getUpdatedEvent(event, activeEvent, {
		rawStart,
		resourceId,
		snapInterval: dragSnapInterval,
	})
	if (!updatedEvent) {
		return null
	}

	const selectedTime = updatedEvent.updates.start
	const selectedCell = cellsWithRects.find(({ cell }) => {
		const startISO = cell.dataset.start
		const endISO = cell.dataset.end
		if (!startISO || !endISO) {
			return false
		}
		if (cell.dataset.disabled === 'true') {
			return false
		}
		let start = dayjs(startISO)
		let end = dayjs(endISO)
		if (timezone) {
			start = start.tz(timezone)
			end = end.tz(timezone)
		}
		const isOnOrAfterStart = selectedTime.valueOf() >= start.valueOf()
		const isBeforeEnd = selectedTime.valueOf() < end.valueOf()
		return isOnOrAfterStart && isBeforeEnd
	})
	if (!selectedCell) {
		return null
	}
	const selectedStartISO = selectedCell.cell.dataset.start
	const selectedEndISO = selectedCell.cell.dataset.end
	if (!selectedStartISO || !selectedEndISO) {
		return null
	}

	let rangeStart = dayjs(selectedStartISO)
	let rangeEnd = dayjs(selectedEndISO)
	if (timezone) {
		rangeStart = rangeStart.tz(timezone)
		rangeEnd = rangeEnd.tz(timezone)
	}
	const rangeDuration = rangeEnd.diff(rangeStart, 'millisecond')
	const progress =
		(selectedTime.diff(rangeStart, 'millisecond') / rangeDuration) * 100
	let selectedPixelStart = selectedCell.rect.left
	let selectedPixelSize = selectedCell.rect.width
	if (axis === 'vertical') {
		selectedPixelStart = selectedCell.rect.top
		selectedPixelSize = selectedCell.rect.height
	}
	const selectedCoordinate =
		selectedPixelStart + selectedPixelSize * (progress / 100)

	return {
		laneId,
		updatedEvent,
		snapTarget: {
			axis,
			coordinate: selectedCoordinate,
		},
		indicator: {
			selectedTime,
			rangeStart,
			rangeEnd,
			progress,
			axis,
			resource,
			left: selectedCell.rect.left,
			top: selectedCell.rect.top,
			width: selectedCell.rect.width,
			height: selectedCell.rect.height,
		},
	} satisfies {
		laneId: string
		updatedEvent: NonNullable<ReturnType<typeof getUpdatedEvent>>
		snapTarget: NonNullable<DragVisualState['snapTarget']>
		indicator: DragIndicatorState
	}
}

const DragTimeIndicator = ({
	indicator,
	event,
	render,
	timeFormat,
	view,
}: {
	indicator: DragIndicatorState
	event: CalendarEvent
	render?: (props: RenderDragTimeIndicatorProps) => React.ReactNode
	timeFormat: TimeFormat
	view: CalendarView
}) => {
	const customIndicator = render?.({
		selectedTime: indicator.selectedTime,
		event,
		rangeStart: indicator.rangeStart,
		rangeEnd: indicator.rangeEnd,
		progress: indicator.progress,
		axis: indicator.axis,
		resource: indicator.resource,
		view,
	})
	const timePattern = timeFormat === '12-hour' ? 'h:mm A' : 'HH:mm'
	const selectedTimeLabel = indicator.selectedTime.format(timePattern)
	let indicatorContent = customIndicator
	if (!render && indicator.axis === 'vertical') {
		indicatorContent = (
			<div
				className="absolute left-0 right-0 flex -translate-y-1/2 items-center"
				data-testid="drag-time-indicator"
				style={{ top: `${indicator.progress}%` }}
			>
				<div className="h-0.5 flex-1 bg-primary" />
				<span className="absolute left-0 -translate-y-full rounded-sm bg-primary px-1 py-0.5 text-[10px] text-primary-foreground shadow-sm">
					{selectedTimeLabel}
				</span>
			</div>
		)
	}
	if (!render && indicator.axis === 'horizontal') {
		indicatorContent = (
			<div
				className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
				data-testid="drag-time-indicator"
				style={{ left: `${indicator.progress}%` }}
			>
				<span className="absolute top-0 -translate-y-full rounded-sm bg-primary px-1 py-0.5 text-[10px] text-primary-foreground shadow-sm">
					{selectedTimeLabel}
				</span>
				<div className="w-0.5 flex-1 bg-primary" />
			</div>
		)
	}

	return createPortal(
		<div
			className="fixed z-50 pointer-events-none"
			data-testid="drag-time-indicator-host"
			style={{
				left: indicator.left,
				top: indicator.top,
				width: indicator.width,
				height: indicator.height,
			}}
		>
			{indicatorContent}
		</div>,
		document.body
	)
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const initialPointerRef = useRef<{ x: number; y: number } | null>(null)
	const livePointerRef = useRef<{ x: number; y: number } | null>(null)
	const grabOffsetRef = useRef<DragGrabOffset | null>(null)
	const calendarRootRef = useRef<HTMLElement | null>(null)
	const pendingDropRef = useRef<NonNullable<
		ReturnType<typeof getUpdatedEvent>
	> | null>(null)
	const lastDragVisualSignatureRef = useRef<string | null>(null)
	const [dragVisual, updateDragVisual] = useReducer(
		(state: DragVisualState, update: Partial<DragVisualState>) => {
			const hasOnlyTimedVisualFields = Object.keys(update).length === 2
			const clearsTimedVisual =
				update.indicator === null && update.snapTarget === undefined
			const isTimedVisualClear = hasOnlyTimedVisualFields && clearsTimedVisual
			const timedVisualAlreadyClear =
				state.indicator === null && state.snapTarget === undefined
			if (isTimedVisualClear && timedVisualAlreadyClear) {
				return state
			}
			return { ...state, ...update }
		},
		EMPTY_DRAG_VISUAL
	)
	const handleMouseMove = useCallback((event: MouseEvent) => {
		livePointerRef.current = { x: event.clientX, y: event.clientY }
	}, [])
	const handleTouchMove = useCallback((event: TouchEvent) => {
		const touch = event.touches[0]
		if (!touch) return
		livePointerRef.current = { x: touch.clientX, y: touch.clientY }
	}, [])

	useEffect(() => {
		return () => {
			window.removeEventListener('mousemove', handleMouseMove, true)
			window.removeEventListener('touchmove', handleTouchMove, true)
		}
	}, [handleMouseMove, handleTouchMove])

	const {
		updateEvent,
		getEventManager,
		getResourceById,
		disableDragAndDrop,
		dragSnapInterval,
		showDragTimeIndicator,
		renderDragTimeIndicator,
		timeFormat,
		timezone,
		view,
	} = useSmartCalendarContext((context) => ({
		updateEvent: context.updateEvent,
		getEventManager: context.getEventManager,
		getResourceById: context.getResourceById,
		disableDragAndDrop: context.disableDragAndDrop,
		dragSnapInterval: context.dragSnapInterval,
		showDragTimeIndicator: context.showDragTimeIndicator,
		renderDragTimeIndicator: context.renderDragTimeIndicator,
		timeFormat: context.timeFormat,
		timezone: context.timezone,
		view: context.view,
	}))

	const { dialogState, openEditDialog, closeDialog, handleConfirm } =
		useScopedEventMutation()

	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: {
			distance: 2,
		},
	})

	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: {
			delay: 100,
			tolerance: 5,
		},
	})

	const sensors = useSensors(mouseSensor, touchSensor)

	const performEventUpdate = (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>
	) => {
		const hasNoUpdates = !updates || Object.keys(updates).length === 0
		if (!event?.id || hasNoUpdates) {
			return
		}

		const owner = getEventManager(event)
		if (owner?.applyEdit) {
			openEditDialog(event, updates)
		} else {
			updateEvent(event.id, updates)
		}
	}

	// fallow-ignore-next-line complexity
	const handleDragStart = (event: DragStartEvent) => {
		const activeData = event.active.data.current as ActiveDragData | undefined
		if (activeData?.type !== 'calendar-event' || !activeData.event) {
			return
		}

		activeEventRef.current = activeData.event
		pendingDropRef.current = null
		lastDragVisualSignatureRef.current = null
		window.addEventListener('mousemove', handleMouseMove, true)
		window.addEventListener('touchmove', handleTouchMove, {
			capture: true,
			passive: true,
		})

		const initialRect = event.active.rect.current.initial
		const activatorTarget = event.activatorEvent.target
		let sourceElement: HTMLElement | null = null
		if (activatorTarget instanceof Element) {
			sourceElement = activatorTarget.closest<HTMLElement>(
				'[data-calendar-draggable-event]'
			)
		}
		const sourceRect = initialRect ?? sourceElement?.getBoundingClientRect()
		calendarRootRef.current =
			sourceElement?.closest<HTMLElement>('[data-calendar-viewport]') ?? null
		let size: DragVisualState['size']
		let sourcePosition: DragVisualState['sourcePosition']
		if (sourceRect) {
			size = { width: sourceRect.width, height: sourceRect.height }
			sourcePosition = { left: sourceRect.left, top: sourceRect.top }
		}
		updateDragVisual({
			activeEvent: activeData.event,
			presentation: activeData.presentation,
			size,
			sourcePosition,
			indicator: null,
			snapTarget: undefined,
		})

		const activatorEvent = event.activatorEvent
		const touchEvent = activatorEvent as TouchEvent
		const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0]
		const mouseEvent = activatorEvent as MouseEvent
		const pointerX = touch?.clientX ?? mouseEvent.clientX
		const pointerY = touch?.clientY ?? mouseEvent.clientY
		const hasPointer = Number.isFinite(pointerX) && Number.isFinite(pointerY)
		initialPointerRef.current = null
		if (hasPointer) {
			initialPointerRef.current = { x: pointerX, y: pointerY }
		}
		livePointerRef.current = null
		const pointerByAxis = { horizontal: pointerX, vertical: pointerY }
		const sourceStartByAxis = {
			horizontal: sourceRect?.left,
			vertical: sourceRect?.top,
		}
		const timeAxis = activeData.timeAxis
		const axisPointer = timeAxis ? pointerByAxis[timeAxis] : undefined
		const sourceStart = timeAxis ? sourceStartByAxis[timeAxis] : undefined
		const hasSourceStart = sourceStart !== undefined
		const hasAxisPointer = Number.isFinite(axisPointer)
		const hasGrabCoordinates = hasSourceStart && hasAxisPointer
		grabOffsetRef.current = null
		if (timeAxis && hasGrabCoordinates) {
			grabOffsetRef.current = {
				axis: timeAxis,
				offset: (axisPointer ?? 0) - (sourceStart ?? 0),
			}
		}
	}

	// fallow-ignore-next-line complexity
	const handleDragMove = (event: DragMoveEvent) => {
		const activeEvent = activeEventRef.current
		const initialPointer = initialPointerRef.current
		if (!activeEvent || !initialPointer) {
			pendingDropRef.current = null
			lastDragVisualSignatureRef.current = null
			updateDragVisual({ indicator: null, snapTarget: undefined })
			return
		}

		const livePointer = livePointerRef.current
		const resolution = resolveTimedDrag({
			event,
			activeEvent,
			pointer: livePointer ?? {
				x: initialPointer.x + event.delta.x,
				y: initialPointer.y + event.delta.y,
			},
			grabOffset: grabOffsetRef.current,
			dragSnapInterval,
			timezone,
			getResourceById,
			queryRoot: calendarRootRef.current ?? document,
		})
		if (!resolution) {
			pendingDropRef.current = null
			lastDragVisualSignatureRef.current = null
			updateDragVisual({ indicator: null, snapTarget: undefined })
			return
		}

		pendingDropRef.current = resolution.updatedEvent
		const { indicator, snapTarget } = resolution
		const dragVisualSignature =
			`${resolution.laneId}|${indicator.selectedTime.valueOf()}|` +
			`${indicator.left}|${indicator.top}|${indicator.width}|${indicator.height}|${snapTarget.coordinate}`
		if (lastDragVisualSignatureRef.current !== dragVisualSignature) {
			lastDragVisualSignatureRef.current = dragVisualSignature
			updateDragVisual({
				snapTarget,
				indicator,
			})
		}
	}

	const clearDrag = () => {
		window.removeEventListener('mousemove', handleMouseMove, true)
		window.removeEventListener('touchmove', handleTouchMove, true)
		activeEventRef.current = null
		initialPointerRef.current = null
		livePointerRef.current = null
		grabOffsetRef.current = null
		calendarRootRef.current = null
		pendingDropRef.current = null
		lastDragVisualSignatureRef.current = null
		updateDragVisual({
			activeEvent: null,
			presentation: undefined,
			size: undefined,
			sourcePosition: undefined,
			indicator: null,
			snapTarget: undefined,
		})
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const activeEvent = activeEventRef.current
		const pendingDrop = pendingDropRef.current
		const dropType = event.over?.data.current?.type
		let fallbackDayDrop: ReturnType<typeof getUpdatedEvent> = null
		if (activeEvent && dropType !== 'time-cell') {
			fallbackDayDrop = getUpdatedEvent(event, activeEvent)
		}
		const updatedEvent = pendingDrop ?? fallbackDayDrop
		if (updatedEvent) {
			performEventUpdate(updatedEvent.activeEvent, updatedEvent.updates)
		}

		clearDrag()
	}

	if (disableDragAndDrop) {
		return children as React.ReactElement
	}

	const {
		activeEvent,
		presentation,
		size,
		sourcePosition,
		indicator,
		snapTarget,
	} = dragVisual
	let dragTimeIndicator: React.ReactNode = null
	if (indicator && activeEvent) {
		dragTimeIndicator = (
			<DragTimeIndicator
				event={activeEvent}
				indicator={indicator}
				render={renderDragTimeIndicator}
				timeFormat={timeFormat}
				view={view}
			/>
		)
	}

	return (
		<>
			<DndContext
				collisionDetection={pointerWithin}
				onDragCancel={clearDrag}
				onDragEnd={handleDragEnd}
				onDragMove={handleDragMove}
				onDragStart={handleDragStart}
				sensors={sensors}
			>
				{children}
				{showDragTimeIndicator && dragTimeIndicator}
				<EventDragOverlay
					activeEvent={activeEvent}
					presentation={presentation}
					size={size}
					snapTarget={snapTarget}
					sourcePosition={sourcePosition}
				/>
			</DndContext>

			<EventMutationScopeSlot
				dialog={dialogState}
				onCancel={closeDialog}
				onResolve={handleConfirm}
			/>
		</>
	)
}
