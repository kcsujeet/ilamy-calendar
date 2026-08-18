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
import { useEffect, useReducer, useRef } from 'react'
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

interface DropCellData {
	type?: 'day-cell' | 'time-cell'
	date?: Dayjs
	start?: Dayjs
	end?: Dayjs
	resourceId?: string | number
	allDay?: boolean
	axis?: 'vertical' | 'horizontal'
	laneId?: string
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

interface PendingDrop {
	updatedEvent: NonNullable<ReturnType<typeof getUpdatedEvent>>
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
	sourceTimeAxis,
	grabOffset,
	dragSnapInterval,
	timezone,
	getResourceById,
}: {
	event: Pick<DragMoveEvent, 'active' | 'delta' | 'over'>
	activeEvent: CalendarEvent
	pointer: { x: number; y: number }
	sourceTimeAxis?: 'vertical' | 'horizontal'
	grabOffset: DragGrabOffset | null
	dragSnapInterval: DragSnapInterval
	timezone?: string
	getResourceById: (
		resourceId: string | number | undefined
	) => Resource | undefined
}) => {
	const allCells = Array.from(
		document.querySelectorAll<HTMLElement>('[data-dnd-lane][data-dnd-axis]')
	).flatMap((cell) => {
		const axis = cell.dataset.dndAxis
		const laneId = cell.dataset.dndLane
		if ((axis !== 'vertical' && axis !== 'horizontal') || !laneId) {
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
	const destinationCell =
		allCells.find(({ axis, rect }) => {
			const crossCoordinate = axis === 'vertical' ? pointer.x : pointer.y
			const crossStart = axis === 'vertical' ? rect.left : rect.top
			const crossEnd = axis === 'vertical' ? rect.right : rect.bottom
			return crossCoordinate >= crossStart && crossCoordinate < crossEnd
		}) ??
		(['vertical', 'horizontal'] as const)
			.flatMap((axis) => {
				const axisLanes = laneRepresentatives
					.filter((lane) => lane.axis === axis)
					.sort((a, b) =>
						axis === 'vertical'
							? a.rect.left - b.rect.left
							: a.rect.top - b.rect.top
					)
				const crossCoordinate = axis === 'vertical' ? pointer.x : pointer.y
				return axisLanes.filter(({ rect }, index) => {
					const crossStart = axis === 'vertical' ? rect.left : rect.top
					const previousRect = axisLanes[index - 1]?.rect
					if (!previousRect) return false
					const previousEnd =
						axis === 'vertical' ? previousRect.right : previousRect.bottom
					const gap = crossStart - previousEnd
					return (
						gap > 0 &&
						gap <= 1 &&
						crossCoordinate >= previousEnd &&
						crossCoordinate < crossStart
					)
				})
			})
			.at(0)
	if (!destinationCell) {
		return null
	}

	const { axis, laneId } = destinationCell
	const pointerCoordinate = axis === 'vertical' ? pointer.y : pointer.x
	const preservesTimedAnchor =
		!activeEvent.allDay && sourceTimeAxis === axis && grabOffset?.axis === axis
	const leadingCoordinate = preservesTimedAnchor
		? pointerCoordinate - grabOffset.offset
		: pointerCoordinate
	const cellsWithRects = allCells
		.filter((cell) => cell.laneId === laneId && cell.axis === axis)
		.sort((a, b) =>
			axis === 'vertical' ? a.rect.top - b.rect.top : a.rect.left - b.rect.left
		)
	const rawCell =
		cellsWithRects.find(({ rect }, index) => {
			const start = axis === 'vertical' ? rect.top : rect.left
			const end = axis === 'vertical' ? rect.bottom : rect.right
			const isLast = index === cellsWithRects.length - 1
			return (
				leadingCoordinate >= start &&
				(leadingCoordinate < end || (isLast && leadingCoordinate === end))
			)
		}) ??
		cellsWithRects.find(({ rect }, index) => {
			const previousRect = cellsWithRects[index - 1]?.rect
			if (!previousRect) return false
			const start = axis === 'vertical' ? rect.top : rect.left
			const previousEnd =
				axis === 'vertical' ? previousRect.bottom : previousRect.right
			const gap = start - previousEnd
			return (
				gap > 0 &&
				gap <= 1 &&
				leadingCoordinate >= previousEnd &&
				leadingCoordinate < start
			)
		})
	const rawStartISO = rawCell?.cell.dataset.start
	const rawEndISO = rawCell?.cell.dataset.end
	if (
		!rawCell ||
		!rawStartISO ||
		!rawEndISO ||
		rawCell.cell.dataset.disabled === 'true'
	) {
		return null
	}

	let rawRangeStart = dayjs(rawStartISO)
	let rawRangeEnd = dayjs(rawEndISO)
	if (timezone) {
		rawRangeStart = rawRangeStart.tz(timezone)
		rawRangeEnd = rawRangeEnd.tz(timezone)
	}
	const rawPixelStart =
		axis === 'vertical' ? rawCell.rect.top : rawCell.rect.left
	const rawPixelSize =
		axis === 'vertical' ? rawCell.rect.height : rawCell.rect.width
	const rawProgress = Math.min(
		1,
		Math.max(0, (leadingCoordinate - rawPixelStart) / rawPixelSize)
	)
	const rawDuration = rawRangeEnd.diff(rawRangeStart, 'millisecond')
	const rawStart = rawRangeStart.add(rawDuration * rawProgress, 'millisecond')
	const serializedResourceId = destinationCell.cell.dataset.resourceId
	const stringResource = getResourceById(serializedResourceId)
	const numericResourceId = Number(serializedResourceId)
	const numericResource = Number.isNaN(numericResourceId)
		? undefined
		: getResourceById(numericResourceId)
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
		if (!startISO || !endISO || cell.dataset.disabled === 'true') {
			return false
		}
		let start = dayjs(startISO)
		let end = dayjs(endISO)
		if (timezone) {
			start = start.tz(timezone)
			end = end.tz(timezone)
		}
		return (
			selectedTime.valueOf() >= start.valueOf() &&
			selectedTime.valueOf() < end.valueOf()
		)
	})
	const selectedStartISO = selectedCell?.cell.dataset.start
	const selectedEndISO = selectedCell?.cell.dataset.end
	if (!selectedCell || !selectedStartISO || !selectedEndISO) {
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
	const selectedPixelStart =
		axis === 'vertical' ? selectedCell.rect.top : selectedCell.rect.left
	const selectedPixelSize =
		axis === 'vertical' ? selectedCell.rect.height : selectedCell.rect.width
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
		updatedEvent: PendingDrop['updatedEvent']
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
			{render ? (
				customIndicator
			) : indicator.axis === 'vertical' ? (
				<div
					className="absolute left-0 right-0 flex -translate-y-1/2 items-center"
					data-testid="drag-time-indicator"
					style={{ top: `${indicator.progress}%` }}
				>
					<div className="h-0.5 flex-1 bg-primary" />
					<span className="absolute left-0 -translate-y-full rounded-sm bg-primary px-1 py-0.5 text-[10px] text-primary-foreground shadow-sm">
						{indicator.selectedTime.format(
							timeFormat === '12-hour' ? 'h:mm A' : 'HH:mm'
						)}
					</span>
				</div>
			) : (
				<div
					className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
					data-testid="drag-time-indicator"
					style={{ left: `${indicator.progress}%` }}
				>
					<span className="absolute top-0 -translate-y-full rounded-sm bg-primary px-1 py-0.5 text-[10px] text-primary-foreground shadow-sm">
						{indicator.selectedTime.format(
							timeFormat === '12-hour' ? 'h:mm A' : 'HH:mm'
						)}
					</span>
					<div className="w-0.5 flex-1 bg-primary" />
				</div>
			)}
		</div>,
		document.body
	)
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const activeTimeAxisRef = useRef<TimeAxis | undefined>(undefined)
	const initialPointerRef = useRef<{ x: number; y: number } | null>(null)
	const livePointerRef = useRef<{ x: number; y: number } | null>(null)
	const grabOffsetRef = useRef<DragGrabOffset | null>(null)
	const pendingDropRef = useRef<PendingDrop | null>(null)
	const lastDragVisualSignatureRef = useRef<string | null>(null)
	const [dragVisual, updateDragVisual] = useReducer(
		(state: DragVisualState, update: Partial<DragVisualState>) => ({
			...state,
			...update,
		}),
		EMPTY_DRAG_VISUAL
	)

	useEffect(() => {
		const mouseMoveListener = (event: MouseEvent) => {
			livePointerRef.current = { x: event.clientX, y: event.clientY }
		}
		const touchMoveListener = (event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touch) return
			livePointerRef.current = { x: touch.clientX, y: touch.clientY }
		}
		window.addEventListener('mousemove', mouseMoveListener, true)
		window.addEventListener('touchmove', touchMoveListener, {
			capture: true,
			passive: true,
		})
		return () => {
			window.removeEventListener('mousemove', mouseMoveListener, true)
			window.removeEventListener('touchmove', touchMoveListener, true)
		}
	}, [])

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
		activeTimeAxisRef.current = activeData.timeAxis
		pendingDropRef.current = null
		lastDragVisualSignatureRef.current = null

		const initialRect = event.active.rect.current.initial
		const activatorTarget = event.activatorEvent.target
		const sourceElement =
			activatorTarget instanceof Element
				? activatorTarget.closest<HTMLElement>(
						'[data-calendar-draggable-event]'
					)
				: null
		const sourceRect = initialRect ?? sourceElement?.getBoundingClientRect()
		updateDragVisual({
			activeEvent: activeData.event,
			presentation: activeData.presentation,
			size: sourceRect
				? { width: sourceRect.width, height: sourceRect.height }
				: undefined,
			sourcePosition: sourceRect
				? { left: sourceRect.left, top: sourceRect.top }
				: undefined,
			indicator: null,
			snapTarget: undefined,
		})

		const activatorEvent = event.activatorEvent
		const touchEvent = activatorEvent as TouchEvent
		const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0]
		const mouseEvent = activatorEvent as MouseEvent
		const pointerX = touch?.clientX ?? mouseEvent.clientX
		const pointerY = touch?.clientY ?? mouseEvent.clientY
		const hasPointer =
			Number.isFinite(pointerX) && Number.isFinite(pointerY) && sourceRect

		initialPointerRef.current = hasPointer ? { x: pointerX, y: pointerY } : null
		livePointerRef.current = null
		if (hasPointer && activeData.timeAxis === 'vertical') {
			grabOffsetRef.current = {
				axis: 'vertical',
				offset: pointerY - sourceRect.top,
			}
		} else if (hasPointer && activeData.timeAxis === 'horizontal') {
			grabOffsetRef.current = {
				axis: 'horizontal',
				offset: pointerX - sourceRect.left,
			}
		} else {
			grabOffsetRef.current = null
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
			sourceTimeAxis: activeTimeAxisRef.current,
			grabOffset: grabOffsetRef.current,
			dragSnapInterval,
			timezone,
			getResourceById,
		})
		if (!resolution) {
			pendingDropRef.current = null
			lastDragVisualSignatureRef.current = null
			updateDragVisual({ indicator: null, snapTarget: undefined })
			return
		}

		pendingDropRef.current = {
			updatedEvent: resolution.updatedEvent,
		}
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
		activeEventRef.current = null
		activeTimeAxisRef.current = undefined
		initialPointerRef.current = null
		livePointerRef.current = null
		grabOffsetRef.current = null
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
		const dropData = event.over?.data.current as DropCellData | undefined
		const fallbackDayDrop =
			activeEvent && dropData?.type !== 'time-cell'
				? getUpdatedEvent(event, activeEvent)
				: null
		const updatedEvent = pendingDrop?.updatedEvent ?? fallbackDayDrop
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
				{showDragTimeIndicator && indicator && activeEvent && (
					<DragTimeIndicator
						event={activeEvent}
						indicator={indicator}
						render={renderDragTimeIndicator}
						timeFormat={timeFormat}
						view={view}
					/>
				)}
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
