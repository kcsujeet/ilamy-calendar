/** @jsxImportSource preact */
import type { RefObject } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import {
	type CalendarEventInput,
	type CalendarOwnerState,
	createTranslator,
	type EventsFetcher,
	formatDate,
	type HeadlessCalendarController,
	type HeadlessCalendarState,
	type OpenEventFormInput,
	type PluginRuntime,
	type PluginViewContext,
	parseDate,
	type ResourcesFetcher,
	resolveZone,
} from '../../../index'
import {
	attachCalendarInteractions,
	type InteractionPreview,
} from '../../interactions/calendar-pointer-engine'
import { SlotHost } from '../components/slot-host'
import {
	EventFormDialog,
	type EventFormDialogState,
} from '../features/dialogs/event-form-dialog'
import {
	MoreEventsDialog,
	type MoreEventsDialogState,
} from '../features/dialogs/more-events-dialog'
import {
	RecurrenceScopeDialog,
	type ScopeDialogState,
} from '../features/dialogs/recurrence-scope-dialog'
import { CalendarHeader } from '../features/header/calendar-header'
import { MonthView } from '../features/views/month-view'
import { TimeGridView } from '../features/views/time-grid-view'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomMutationScope,
	RendererActions,
} from '../types/renderer.types'
import { useRangeFetcher } from '../utils/async-fetcher.utils'
import {
	type CalendarFormatters,
	createCalendarFormatters,
} from '../utils/format.utils'
import type { ScrollRequest } from '../utils/scroll-to-time.utils'
import { buildSlotProps } from '../utils/slot-props.utils'

const LIVE_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
	year: { year: 'numeric' },
	month: { month: 'long', year: 'numeric' },
}

const DEFAULT_LIVE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	month: 'long',
	day: 'numeric',
	year: 'numeric',
}

const INVALID_OUTLINE = '2px dashed var(--ilamy-danger, #ef4444)'
const VALID_TINT_COLOR = 'rgba(188, 232, 241, 0.3)'

const clearHighlights = (root: HTMLElement | null) => {
	if (!root) return
	delete root.dataset.dragging
	const tints = root.querySelectorAll('[data-ilamy-drop-tint]')
	for (const tint of tints) {
		tint.remove()
	}
	const nodes = root.querySelectorAll<HTMLElement>(
		'[data-drop-target], [data-select-range], [data-drag-origin]'
	)
	for (const node of nodes) {
		delete node.dataset.dropTarget
		delete node.dataset.selectRange
		delete node.dataset.dragOrigin
		node.style.outline = ''
		node.style.opacity = ''
	}
}

const attachDropTint = (cell: HTMLElement) => {
	cell.dataset.dropTarget = 'true'
	const tint = document.createElement('div')
	tint.setAttribute('aria-hidden', 'true')
	tint.dataset.ilamyDropTint = 'true'
	tint.style.position = 'absolute'
	tint.style.inset = '0'
	tint.style.pointerEvents = 'none'
	tint.style.backgroundColor = VALID_TINT_COLOR
	tint.style.zIndex = '5'
	cell.appendChild(tint)
}

const matchesPreviewCellBand = (
	cell: HTMLElement,
	preview: InteractionPreview
): boolean => {
	if (
		preview.resourceId !== undefined &&
		cell.dataset.resourceId !== String(preview.resourceId)
	) {
		return false
	}
	const isAllDayRowCell = cell.dataset.ilamyPart === 'all-day-cell'
	if (preview.allDay === false && isAllDayRowCell) return false
	if (preview.allDay === true && cell.dataset.ilamyPart === 'time-slot') {
		return false
	}
	return true
}

const collectCoveredDropCells = (
	root: HTMLElement,
	preview: InteractionPreview
): HTMLElement[] => {
	if (!(preview.start && preview.end)) return [preview.cellEl]
	const pStartMs = preview.start.epochMilliseconds
	const pEndMs = preview.end.epochMilliseconds
	const matched: HTMLElement[] = []
	const candidates = root.querySelectorAll<HTMLElement>(
		'[data-cell="true"][data-start][data-end]'
	)
	for (const cell of candidates) {
		if (!matchesPreviewCellBand(cell, preview)) continue
		const cStartMs = Date.parse(cell.dataset.start ?? '')
		const cEndMs = Date.parse(cell.dataset.end ?? '')
		if (cStartMs < pEndMs && cEndMs > pStartMs) {
			matched.push(cell)
		}
	}
	return matched.length > 0 ? matched : [preview.cellEl]
}

const applyPreviewHighlight = (
	root: HTMLElement | null,
	preview: InteractionPreview
) => {
	clearHighlights(root)
	if (!root) return
	root.dataset.dragging = 'true'
	if (!preview.allowed) {
		preview.cellEl.dataset.dropTarget = 'invalid'
		preview.cellEl.style.outline = INVALID_OUTLINE
	} else {
		for (const cell of collectCoveredDropCells(root, preview)) {
			attachDropTint(cell)
		}
	}
	if (preview.mode === 'move' && preview.eventId !== undefined) {
		const bar = root.querySelector<HTMLElement>(
			`[data-event-id="${preview.eventId}"]`
		)
		if (bar) {
			bar.dataset.dragOrigin = 'true'
			bar.style.opacity = '0.55'
		}
	}
}

const useLiveAnnouncement = (state: HeadlessCalendarState): string => {
	const initialKeyRef = useRef<string | null>(null)
	const textRef = useRef('')
	const liveKey = `${state.view}:${state.currentDate}`
	if (initialKeyRef.current === null) {
		initialKeyRef.current = liveKey
		textRef.current = ''
	} else if (initialKeyRef.current !== liveKey) {
		initialKeyRef.current = liveKey
		const parsed = parseDate(state.currentDate, state.timezone)
		if (parsed) {
			const fmt = LIVE_DATE_FORMATS[state.view] ?? DEFAULT_LIVE_DATE_FORMAT
			textRef.current = `${state.view}, ${formatDate(parsed, fmt, state.locale)}`
		}
	}
	return textRef.current
}

const useCalendarFormattersAndActions = ({
	state,
	options,
	props,
}: {
	state: HeadlessCalendarState
	options: DomCalendarOptions
	props: CalendarAppProps
}) => {
	const hasResourceAxis = state.resources.length > 0
	const orientation = options.orientation ?? 'horizontal'

	const ownerState = useMemo<CalendarOwnerState>(
		() => ({
			view: state.view,
			currentDate: state.currentDate,
			timezone: resolveZone(state.timezone),
			locale: state.locale,
			unstyled: Boolean(options.unstyled),
			hasResourceAxis,
			orientation,
		}),
		[
			state.view,
			state.currentDate,
			state.timezone,
			state.locale,
			options.unstyled,
			hasResourceAxis,
			orientation,
		]
	)

	const t = useMemo(
		() =>
			createTranslator(
				options.translations as Parameters<typeof createTranslator>[0],
				options.translator
			),
		[options.translations, options.translator]
	)

	const actions = useMemo<RendererActions>(
		() => ({
			ownerState,
			t,
			pluginRuntime: props.pluginRuntime,
			rawEvents: props.storedEvents,
			openCreateDialog: props.onOpenCreateDialog,
			openEventForm: props.onOpenEventForm,
			openEditDialog: props.onOpenEditDialog,
			openOverflowDialog: props.onOpenOverflowDialog,
			commitAdd: props.onCommitAdd,
			commitUpdate: props.onCommitUpdate,
			commitDelete: props.onCommitDelete,
		}),
		[
			ownerState,
			t,
			props.pluginRuntime,
			props.storedEvents,
			props.onOpenCreateDialog,
			props.onOpenEventForm,
			props.onOpenEditDialog,
			props.onOpenOverflowDialog,
			props.onCommitAdd,
			props.onCommitUpdate,
			props.onCommitDelete,
		]
	)

	const formatters = useMemo(
		() =>
			createCalendarFormatters({
				view: state.view,
				locale: state.locale,
				timezone: state.timezone,
				timeFormat: options.timeFormat,
				explicitTimeFormat: options.timeFormat,
				slotHeaderFormat: options.slotHeaderFormat,
				eventTimeFormat: options.eventTimeFormat,
				dayHeaderFormat: options.dayHeaderFormat,
				titleFormat: options.titleFormat,
				displayEventTime: options.displayEventTime,
				displayEventEnd: options.displayEventEnd,
			}),
		[state.view, state.locale, state.timezone, options]
	)

	return { ownerState, actions, formatters }
}

const useCalendarInteractionsBinding = ({
	rootRef,
	options,
	visibleEvents,
	actions,
	controller,
	onRequestScope,
	onPreviewUpdate,
}: {
	rootRef: RefObject<HTMLDivElement | null>
	options: DomCalendarOptions
	visibleEvents: DomCalendarEvent[]
	actions: RendererActions
	controller: HeadlessCalendarController
	onRequestScope: CalendarAppProps['onRequestScope']
	onPreviewUpdate: (preview: InteractionPreview | null) => void
}) => {
	const latestRef = useRef({
		options,
		visibleEvents,
		actions,
		controller,
		onRequestScope,
		onPreviewUpdate,
	})
	latestRef.current = {
		options,
		visibleEvents,
		actions,
		controller,
		onRequestScope,
		onPreviewUpdate,
	}

	useEffect(() => {
		const root = rootRef.current
		if (!root) return
		const handle = attachCalendarInteractions({
			root,
			resolveEvent: (eventId) =>
				latestRef.current.visibleEvents.find(
					(item) => String(item.id) === eventId
				),
			getState: () => {
				const cur = latestRef.current
				const calState = cur.controller.getState()
				const scrollAxis =
					calState.resources.length === 0
						? 'both'
						: cur.options.orientation === 'horizontal'
							? 'x'
							: 'y'
				return {
					events: cur.visibleEvents,
					resources: calState.resources,
					timezone: calState.timezone,
					hiddenDays: calState.hiddenDays,
					editable: cur.options.editable,
					eventStartEditable: cur.options.eventStartEditable,
					eventDurationEditable: cur.options.eventDurationEditable,
					eventResizableFromStart: cur.options.eventResizableFromStart,
					enableDragToCreate: Boolean(
						cur.actions.pluginRuntime.getDragToCreate()
					),
					businessHours: cur.options.businessHours,
					eventConstraint: cur.options.eventConstraint,
					selectConstraint: cur.options.selectConstraint,
					disableCellClick: cur.options.disableCellClick,
					isCellDisabled: cur.options.isCellDisabled,
					eventAllow: cur.options.eventAllow,
					slotDurationMinutes: cur.options.slotDuration,
					snapDurationMinutes: cur.options.snapDuration,
					scrollAxis,
				}
			},
			onEventClick: (event) => {
				const cur = latestRef.current
				if (cur.options.disableEventClick) return
				const domEvt = event as DomCalendarEvent
				cur.options.onEventClick?.(domEvt)
				cur.actions.openEditDialog(domEvt)
			},
			onPreviewChange: (preview) => {
				latestRef.current.onPreviewUpdate(preview)
				if (!preview) clearHighlights(root)
				else applyPreviewHighlight(root, preview)
			},
			onSelectionChange: (selection) => {
				clearHighlights(root)
				if (!selection) return
				selection.startCell.element.dataset.selectRange = 'true'
				selection.endCell.element.dataset.selectRange = 'true'
				selection.endCell.element.style.outline =
					'2px solid var(--ilamy-primary, #18181b)'
			},
			onMoveCommit: (event, placement, info) => {
				const cur = latestRef.current
				const domEvt = event as DomCalendarEvent
				const updates: Partial<DomCalendarEventInput> = {
					start: placement.start,
					end: placement.end,
					allDay: placement.allDay,
					resourceId: placement.resourceId,
				}
				if (cur.actions.pluginRuntime.getEventManager(domEvt)) {
					cur.onRequestScope(domEvt, 'edit', (scope) => {
						cur.actions.commitUpdate(domEvt, updates, scope, info)
					})
					return
				}
				cur.actions.commitUpdate(domEvt, updates, 'this', info)
			},
			onResizeCommit: (event, placement, info) => {
				const cur = latestRef.current
				const domEvt = event as DomCalendarEvent
				const updates: Partial<DomCalendarEventInput> = {
					start: placement.start,
					end: placement.end,
				}
				if (cur.actions.pluginRuntime.getEventManager(domEvt)) {
					cur.onRequestScope(domEvt, 'edit', (scope) => {
						cur.actions.commitUpdate(domEvt, updates, scope, info)
					})
					return
				}
				cur.actions.commitUpdate(domEvt, updates, 'this', info)
			},
			onRangeSelect: (selection) => {
				const cur = latestRef.current
				cur.options.onRangeSelect?.(selection)
				const dragConfig = cur.actions.pluginRuntime.getDragToCreate()
				if (dragConfig?.onSelect) {
					dragConfig.onSelect(selection, cur.actions.openEventForm)
					return
				}
				cur.actions.openCreateDialog(selection)
			},
		})
		return () => {
			handle.destroy()
			clearHighlights(root)
		}
	}, [rootRef])
}

const useCalendarRuntime = (
	props: CalendarAppProps,
	rootRef: RefObject<HTMLDivElement | null>
) => {
	const { controller, options, pluginRuntime, storedEvents } = props
	const state = controller.getState()
	const { ownerState, actions, formatters } = useCalendarFormattersAndActions({
		state,
		options,
		props,
	})
	const visibleEvents = useMemo(
		() =>
			pluginRuntime.transformEvents(storedEvents, {
				start: state.visibleRange.start,
				end: state.visibleRange.end,
				timezone: state.timezone,
			}),
		[
			pluginRuntime,
			storedEvents,
			state.visibleRange.start,
			state.visibleRange.end,
			state.timezone,
		]
	)
	const eventsFetcher: EventsFetcher | undefined =
		typeof options.events === 'function' ? options.events : undefined
	const resourcesFetcher: ResourcesFetcher | undefined =
		typeof options.resources === 'function' ? options.resources : undefined

	const [dragPreview, setDragPreview] = useState<InteractionPreview | null>(
		null
	)
	const { refetch } = useRangeFetcher({
		name: 'events',
		fetcher: eventsFetcher,
		followsRange: true,
		visibleRange: state.visibleRange,
		timezone: state.timezone,
		lazyFetching: options.lazyFetching,
		loading: options.loading,
		onError: options.onEventsError,
		onResult: props.onFetchedEvents,
	})
	props.registerRefetchEvents(refetch)

	const { refetch: refetchResources } = useRangeFetcher({
		name: 'resources',
		fetcher: resourcesFetcher,
		followsRange: Boolean(options.refetchResourcesOnNavigate),
		visibleRange: state.visibleRange,
		timezone: state.timezone,
		lazyFetching: options.lazyFetching,
		onError: options.onResourcesError,
		onResult: props.onFetchedResources,
	})
	props.registerRefetchResources(refetchResources)

	const liveAnnouncement = useLiveAnnouncement(state)
	useCalendarInteractionsBinding({
		rootRef,
		options,
		visibleEvents,
		actions,
		controller,
		onRequestScope: props.onRequestScope,
		onPreviewUpdate: setDragPreview,
	})

	return {
		state,
		ownerState,
		actions,
		formatters,
		visibleEvents,
		dragPreview,
		liveAnnouncement,
	}
}

const ActiveCalendarView = ({
	view,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreview,
	scrollRequest,
}: {
	view: string
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreview: InteractionPreview | null
	scrollRequest?: ScrollRequest
}) => {
	const state = controller.getState()
	const pluginView = actions.pluginRuntime.getView(view)
	const pluginViewContext = useMemo<PluginViewContext>(
		() => ({
			controller,
			state,
			events: visibleEvents,
			ownerState: actions.ownerState,
			t: actions.t,
			slotProps: options.slotProps,
			dayMaxEvents: options.dayMaxEvents,
			firstDayOfWeek: state.firstDayOfWeek,
			timezone: state.timezone,
			locale: state.locale,
			timeFormat: options.timeFormat,
			nowIndicator: options.nowIndicator,
			disableEventClick: options.disableEventClick,
			unstyled: options.unstyled,
			openEventForm: actions.openEventForm,
			onEventClick: (evt) => options.onEventClick?.(evt),
			onCellClick: (cell) => options.onCellClick?.(cell),
			onMoreEventsClick: options.onMoreEventsClick,
			eventSlot: options.slots?.event,
			renderEvent: options.renderEvent
				? (container, { event, segment }) =>
						options.renderEvent?.(container, {
							event,
							segment,
							view: state.view,
							timezone: state.timezone,
							timeFormat: options.timeFormat ?? '12-hour',
						})
				: undefined,
		}),
		[controller, state, visibleEvents, actions, options]
	)

	if (pluginView?.mountView) {
		return (
			<SlotHost
				context={pluginViewContext}
				slot={pluginView.mountView}
				slotKey={pluginView.name}
			/>
		)
	}

	if (view === 'day' || view === 'week') {
		return (
			<TimeGridView
				actions={actions}
				controller={controller}
				dragPreview={dragPreview}
				formatters={formatters}
				mode={view}
				options={options}
				scrollRequest={scrollRequest}
				visibleEvents={visibleEvents}
			/>
		)
	}
	return (
		<MonthView
			actions={actions}
			controller={controller}
			dragPreview={dragPreview}
			formatters={formatters}
			options={options}
			visibleEvents={visibleEvents}
		/>
	)
}

export interface CalendarAppProps {
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	pluginRuntime: PluginRuntime
	storedEvents: DomCalendarEvent[]
	eventDialog: EventFormDialogState
	moreDialog: MoreEventsDialogState
	scopeDialog: ScopeDialogState
	scrollRequest?: ScrollRequest
	onOpenCreateDialog: (
		cell?: Parameters<RendererActions['openCreateDialog']>[0]
	) => void
	onOpenEditDialog: (event: DomCalendarEvent) => void
	onOpenEventForm: (input?: OpenEventFormInput) => void
	onOpenOverflowDialog: (
		dateIso: string,
		title: string,
		events: DomCalendarEvent[]
	) => void
	onCloseEventDialog: () => void
	onCloseMoreDialog: () => void
	onRequestScope: (
		event: DomCalendarEvent,
		mode: 'edit' | 'delete',
		onConfirm: (scope: DomMutationScope) => void
	) => void
	onCloseScope: () => void
	onCommitAdd: (input: DomCalendarEventInput) => DomCalendarEvent
	onCommitUpdate: RendererActions['commitUpdate']
	onCommitDelete: RendererActions['commitDelete']
	onFetchedEvents: (rows: CalendarEventInput[]) => void
	onFetchedResources: (
		rows: NonNullable<
			ReturnType<HeadlessCalendarController['getState']>['resources']
		>
	) => void
	registerRefetchEvents: (fn: () => void) => void
	registerRefetchResources: (fn: () => void) => void
}

export const CalendarApp = (props: CalendarAppProps) => {
	const rootRef = useRef<HTMLDivElement>(null)
	const {
		state,
		ownerState,
		actions,
		formatters,
		visibleEvents,
		dragPreview,
		liveAnnouncement,
	} = useCalendarRuntime(props, rootRef)
	const rootSlot = buildSlotProps(
		props.options.slotProps,
		'root',
		ownerState,
		props.options.className
	)
	const gridSlot = buildSlotProps(props.options.slotProps, 'grid', ownerState)

	return (
		<div
			className={rootSlot.className}
			data-ilamy-root=""
			data-ilamy-slot="root"
			data-slot="root"
			data-testid="ilamy-calendar"
			data-unstyled={props.options.unstyled ? 'true' : undefined}
			ref={rootRef}
			style={rootSlot.style}
		>
			<div
				aria-atomic="true"
				aria-live="polite"
				data-ilamy-sr-only=""
				data-testid="calendar-live-region"
			>
				{liveAnnouncement}
			</div>

			<CalendarHeader
				actions={actions}
				controller={props.controller}
				formatters={formatters}
				options={props.options}
			/>

			<div
				className={gridSlot.className}
				data-calendar-viewport="true"
				data-ilamy-slot="grid"
				data-testid="calendar-body"
				style={gridSlot.style}
			>
				<ActiveCalendarView
					actions={actions}
					controller={props.controller}
					dragPreview={dragPreview}
					formatters={formatters}
					options={props.options}
					scrollRequest={props.scrollRequest}
					view={state.view}
					visibleEvents={visibleEvents}
				/>
			</div>

			<EventFormDialog
				actions={actions}
				controller={props.controller}
				onClose={props.onCloseEventDialog}
				onRequestScope={props.onRequestScope}
				options={props.options}
				state={props.eventDialog}
			/>

			<MoreEventsDialog
				actions={actions}
				controller={props.controller}
				formatters={formatters}
				onClose={props.onCloseMoreDialog}
				options={props.options}
				state={props.moreDialog}
			/>

			<RecurrenceScopeDialog
				actions={actions}
				onCancel={props.onCloseScope}
				options={props.options}
				state={props.scopeDialog}
			/>
		</div>
	)
}
