/** @jsxImportSource preact */
import { render } from 'preact'
import {
	type CalendarEvent,
	type CalendarEventInput,
	type CellInfo,
	createCalendarController,
	createPluginRuntime,
	diffDayAndTime,
	type EventDelta,
	type EventsChange,
	isSameResourceList,
	type MountedCalendarSnapshot,
	normalizeEvent,
	type OpenEventFormInput,
	type PluginMutationResult,
	type PluginRuntime,
	parseDate,
	type Resource,
} from '../../../index'
import type { EventFormDialogState } from '../features/dialogs/event-form-dialog'
import type { MoreEventsDialogState } from '../features/dialogs/more-events-dialog'
import type { ScopeDialogState } from '../features/dialogs/recurrence-scope-dialog'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomMutationScope,
	MountedCalendar,
} from '../types/renderer.types'
import type { ScrollRequest } from '../utils/scroll-to-time.utils'
import { CalendarApp } from './calendar-app'

const normalizeEventsWithPlugins = (
	events: DomCalendarOptions['events'],
	runtime: PluginRuntime,
	timezone: string
): DomCalendarEvent[] | undefined => {
	if (!Array.isArray(events)) return undefined
	return events.map((ev) =>
		normalizeEvent(runtime.normalizeEvent(ev, timezone), timezone)
	)
}

const normalizeMutationOutput = (
	raw: CalendarEvent[] | PluginMutationResult
): PluginMutationResult =>
	Array.isArray(raw)
		? { events: raw, updated: raw, added: [], deleted: [] }
		: raw

const CONTROLLER_SCALAR_KEYS = [
	'timezone',
	'locale',
	'firstDayOfWeek',
	'hiddenDays',
	'weekends',
] as const

type ControllerUpdatePatch = Parameters<
	ReturnType<typeof createCalendarController>['updateConfig']
>[0]

const assignControllerScalarConfig = (
	patch: ControllerUpdatePatch,
	nextOptions: Partial<DomCalendarOptions>
) => {
	for (const key of CONTROLLER_SCALAR_KEYS) {
		if (key in nextOptions) {
			;(patch as Record<string, unknown>)[key] = nextOptions[key]
		}
	}
}

const buildControllerPatch = (
	nextOptions: Partial<DomCalendarOptions>,
	runtime: PluginRuntime,
	timezone: string
): ControllerUpdatePatch => {
	const patch: ControllerUpdatePatch = {}
	assignControllerScalarConfig(patch, nextOptions)
	if ('plugins' in nextOptions) {
		patch.pluginViews = runtime.getViews()
	}
	if (
		'resources' in nextOptions &&
		typeof nextOptions.resources !== 'function'
	) {
		patch.resources = Array.isArray(nextOptions.resources)
			? nextOptions.resources
			: []
	}
	if (Array.isArray(nextOptions.events)) {
		patch.events = normalizeEventsWithPlugins(
			nextOptions.events,
			runtime,
			nextOptions.timezone ?? timezone
		)
	}
	return patch
}

const applyDirectEventUpdate = (
	storedEvents: DomCalendarEvent[],
	event: DomCalendarEvent,
	updates: Partial<DomCalendarEventInput>,
	runtime: PluginRuntime,
	timezone: string
): PluginMutationResult => {
	let singleUpdated: DomCalendarEvent | undefined
	const nextEvents = storedEvents.map((existing) => {
		if (existing.id !== event.id) return existing
		singleUpdated = normalizeEvent(
			runtime.normalizeEvent(
				{
					...existing,
					...updates,
					start: updates.start ?? existing.start,
					end: updates.end ?? existing.end,
				},
				timezone
			),
			timezone
		)
		return singleUpdated
	})
	return {
		events: nextEvents,
		updated: singleUpdated ? [singleUpdated] : [],
		added: [],
		deleted: [],
	}
}

const resolvePrimaryUpdatedEvent = (
	res: PluginMutationResult,
	event: DomCalendarEvent,
	updates: Partial<DomCalendarEventInput>,
	timezone: string
): DomCalendarEvent => {
	const fromUpdated = res.updated.at(0)
	if (fromUpdated) return fromUpdated
	const fromEvents = res.events.find((e) => e.id === event.id)
	if (fromEvents) return fromEvents
	const merged = res.appliedUpdates ?? updates
	return normalizeEvent(
		{
			...event,
			...merged,
			start: merged.start ?? event.start,
			end: merged.end ?? event.end,
		},
		timezone
	)
}

const computeFallbackDelta = (
	beforeIso: string,
	afterIso: string,
	timezone: string
): EventDelta => {
	const prev = parseDate(beforeIso, timezone)
	const next = parseDate(afterIso, timezone)
	if (!(prev && next)) return { days: 0, milliseconds: 0 }
	return diffDayAndTime(prev, next)
}

const resolveDeltaPair = (
	beforeIso: string,
	afterIso: string | undefined,
	fallback: EventDelta | undefined,
	timezone: string
): EventDelta | undefined => {
	if (!afterIso) return fallback
	const before = parseDate(beforeIso, timezone)
	const after = parseDate(afterIso, timezone)
	if (!(before && after)) return fallback
	return diffDayAndTime(before, after)
}

export const resolveCommittedDeltas = ({
	event,
	primary,
	appliedUpdates,
	deltas,
	timezone,
}: {
	event: DomCalendarEvent
	primary: DomCalendarEvent
	appliedUpdates: PluginMutationResult['appliedUpdates']
	deltas:
		| {
				delta?: EventDelta
				endDelta?: EventDelta
		  }
		| undefined
	timezone: string
}) => {
	if (appliedUpdates) {
		return {
			delta: resolveDeltaPair(
				event.start,
				appliedUpdates.start,
				deltas?.delta ??
					computeFallbackDelta(event.start, primary.start, timezone),
				timezone
			),
			endDelta: resolveDeltaPair(
				event.end,
				appliedUpdates.end,
				deltas?.endDelta ??
					computeFallbackDelta(event.end, primary.end, timezone),
				timezone
			),
		}
	}
	return {
		delta:
			deltas !== undefined
				? deltas.delta
				: computeFallbackDelta(event.start, primary.start, timezone),
		endDelta:
			deltas !== undefined
				? deltas.endDelta
				: computeFallbackDelta(event.end, primary.end, timezone),
	}
}

const CLOSED_EVENT_DIALOG: EventFormDialogState = { open: false, event: null }
const CLOSED_MORE_DIALOG: MoreEventsDialogState = {
	open: false,
	dateIso: '',
	title: '',
	events: [],
}
const CLOSED_SCOPE_DIALOG: ScopeDialogState = {
	open: false,
	event: null,
	operation: 'edit',
}

/**
 * Mounts the internal Preact calendar renderer into `container` and returns a
 * framework-agnostic `MountedCalendar` control handle.
 */
export const mountCalendar = (
	container: HTMLElement,
	initialOptions: DomCalendarOptions = {}
): MountedCalendar => {
	let options: DomCalendarOptions = { ...initialOptions }
	let pluginRuntime = createPluginRuntime(options.plugins)
	let eventDialog: EventFormDialogState = CLOSED_EVENT_DIALOG
	let moreDialog: MoreEventsDialogState = CLOSED_MORE_DIALOG
	let scopeDialog: ScopeDialogState = CLOSED_SCOPE_DIALOG
	let scrollRequest: ScrollRequest | undefined
	let refetchEventsFn: () => void = () => undefined
	let refetchResourcesFn: () => void = () => undefined
	let isUpdating = false
	let destroyed = false
	let lastReportedResources: Resource[] | undefined
	const snapshotListeners = new Set<() => void>()

	const reportResourcesIfChanged = (rows: Resource[] | undefined) => {
		if (!rows) return
		if (
			lastReportedResources &&
			isSameResourceList(lastReportedResources, rows)
		) {
			return
		}
		lastReportedResources = rows
		options.resourcesSet?.(rows)
	}

	const initialEvents = Array.isArray(options.events)
		? options.events.map((ev) =>
				pluginRuntime.normalizeEvent(ev, options.timezone ?? 'UTC')
			)
		: undefined

	const controller =
		options.controller ??
		createCalendarController({
			initialDate: options.initialDate,
			initialView: options.initialView ?? 'month',
			events: initialEvents,
			resources: Array.isArray(options.resources)
				? options.resources
				: undefined,
			timezone: options.timezone,
			locale: options.locale,
			firstDayOfWeek: options.firstDayOfWeek,
			hiddenDays: options.hiddenDays,
			weekends: options.weekends,
			pluginViews: pluginRuntime.getViews(),
			onDateChange: (date, range) => options.onDateChange?.(date, range),
			onViewChange: (view) => options.onViewChange?.(view),
		})

	let storedEvents: DomCalendarEvent[] = [...controller.getState().events]

	const computeVisibleEvents = () => {
		const state = controller.getState()
		return pluginRuntime.transformEvents(storedEvents, {
			start: state.visibleRange.start,
			end: state.visibleRange.end,
			timezone: state.timezone,
		})
	}

	const buildSnapshot = (): MountedCalendarSnapshot => {
		const selectedDate =
			eventDialog.cell?.start ??
			(eventDialog.draft?.start ? String(eventDialog.draft.start) : null)
		return {
			isEventFormOpen: eventDialog.open,
			selectedEvent: eventDialog.event,
			selectedDate,
			rawEvents: storedEvents,
			visibleEvents: computeVisibleEvents(),
			timeFormat: options.timeFormat ?? '12-hour',
		}
	}

	let snapshot: MountedCalendarSnapshot = buildSnapshot()

	const notifySnapshot = () => {
		snapshot = buildSnapshot()
		for (const listener of snapshotListeners) {
			listener()
		}
	}

	const mountHost = document.createElement('div')
	mountHost.style.display = 'contents'
	container.appendChild(mountHost)

	const setStoredEvents = (next: DomCalendarEvent[]) => {
		storedEvents = next
		controller.setEvents(next)
		notifySnapshot()
	}

	const dispatchRowCallbacks = (res: PluginMutationResult) => {
		for (const row of res.updated) options.onEventUpdate?.(row)
		for (const row of res.added) options.onEventAdd?.(row)
		for (const row of res.deleted) options.onEventDelete?.(row)
	}

	const createRevert = (prev: DomCalendarEvent[]): (() => void) => {
		let reverted = false
		return () => {
			if (reverted) return
			reverted = true
			setStoredEvents(prev)
		}
	}

	const commitAdd = (input: DomCalendarEventInput): DomCalendarEvent => {
		const state = controller.getState()
		const prev = [...storedEvents]
		const created = normalizeEvent(
			pluginRuntime.normalizeEvent(input, state.timezone),
			state.timezone
		)
		setStoredEvents([...storedEvents, created])
		options.onEventAdd?.(created)
		const change: EventsChange = {
			action: 'add',
			event: created,
			added: [created],
			updated: [],
			deleted: [],
			revert: createRevert(prev),
		}
		options.onEventsChange?.(change)
		return created
	}

	const commitUpdate = (
		event: DomCalendarEvent,
		updates: Partial<DomCalendarEventInput>,
		scope: DomMutationScope = 'this',
		deltas?: {
			delta?: { days: number; milliseconds: number }
			endDelta?: { days: number; milliseconds: number }
		}
	): DomCalendarEvent | undefined => {
		const state = controller.getState()
		const prev = [...storedEvents]
		const manager = pluginRuntime.getEventManager(event)

		const res = manager?.applyEdit
			? normalizeMutationOutput(
					manager.applyEdit({
						event,
						updates: updates as Partial<CalendarEvent>,
						currentEvents: storedEvents,
						scope,
						timezone: state.timezone,
					})
				)
			: applyDirectEventUpdate(
					storedEvents,
					event,
					updates,
					pluginRuntime,
					state.timezone
				)

		const primary = resolvePrimaryUpdatedEvent(
			res,
			event,
			updates,
			state.timezone
		)
		const resolvedDeltas = resolveCommittedDeltas({
			event,
			primary,
			appliedUpdates: res.appliedUpdates,
			deltas,
			timezone: state.timezone,
		})

		dispatchRowCallbacks(res)
		setStoredEvents(res.events)
		const change: EventsChange = {
			action: 'update',
			event: manager?.applyEdit ? event : primary,
			scope,
			added: res.added,
			updated: res.updated,
			deleted: res.deleted,
			delta: resolvedDeltas.delta,
			endDelta: resolvedDeltas.endDelta,
			revert: createRevert(prev),
		}
		options.onEventsChange?.(change)
		return primary
	}

	const commitDelete = (
		event: DomCalendarEvent,
		scope: DomMutationScope = 'this'
	): DomCalendarEvent | undefined => {
		const state = controller.getState()
		const prev = [...storedEvents]
		const manager = pluginRuntime.getEventManager(event)

		let res: PluginMutationResult
		if (manager?.applyDelete) {
			res = normalizeMutationOutput(
				manager.applyDelete({
					event,
					currentEvents: storedEvents,
					scope,
					timezone: state.timezone,
				})
			)
		} else {
			const removed = storedEvents.find((e) => e.id === event.id)
			res = {
				events: storedEvents.filter((e) => e.id !== event.id),
				updated: [],
				added: [],
				deleted: removed ? [removed] : [],
			}
		}

		dispatchRowCallbacks(res)
		setStoredEvents(res.events)
		const change: EventsChange = {
			action: 'delete',
			event,
			scope,
			added: res.added,
			updated: res.updated,
			deleted: res.deleted,
			revert: createRevert(prev),
		}
		options.onEventsChange?.(change)
		return event
	}

	const closeEventDialog = () => {
		eventDialog = CLOSED_EVENT_DIALOG
		renderTree()
		notifySnapshot()
	}

	const openCreateDialog = (cell?: CellInfo) => {
		moreDialog = CLOSED_MORE_DIALOG
		eventDialog = { open: true, event: null, cell }
		renderTree()
		notifySnapshot()
	}

	const openEditDialog = (event: DomCalendarEvent) => {
		eventDialog = { open: true, event }
		renderTree()
		notifySnapshot()
	}

	const openEventForm = (input?: OpenEventFormInput) => {
		moreDialog = CLOSED_MORE_DIALOG
		if (input?.id !== undefined) {
			const match = storedEvents.find((e) => e.id === input.id)
			if (match) {
				eventDialog = { open: true, event: match }
				renderTree()
				notifySnapshot()
				return
			}
		}
		eventDialog = { open: true, event: null, draft: input }
		renderTree()
		notifySnapshot()
	}

	const openOverflowDialog = (
		dateIso: string,
		title: string,
		events: DomCalendarEvent[]
	) => {
		eventDialog = CLOSED_EVENT_DIALOG
		moreDialog = { open: true, dateIso, title, events }
		renderTree()
		notifySnapshot()
	}

	const handleFetchedEvents = (rows: CalendarEventInput[]) => {
		const zone = controller.getState().timezone
		const normalized = rows.map((row) =>
			pluginRuntime.normalizeEvent(row, zone)
		)
		controller.setEvents(normalized)
		storedEvents = [...controller.getState().events]
		renderTree()
		notifySnapshot()
	}

	const handleFetchedResources = (rows: Resource[]) => {
		controller.setResources(rows)
		reportResourcesIfChanged(rows)
	}

	const renderTree = () => {
		if (destroyed || isUpdating) return
		snapshot = buildSnapshot()
		render(
			<CalendarApp
				controller={controller}
				eventDialog={eventDialog}
				moreDialog={moreDialog}
				onCloseEventDialog={closeEventDialog}
				onCloseMoreDialog={() => {
					moreDialog = CLOSED_MORE_DIALOG
					renderTree()
				}}
				onCloseScope={() => {
					scopeDialog = CLOSED_SCOPE_DIALOG
					renderTree()
				}}
				onCommitAdd={commitAdd}
				onCommitDelete={commitDelete}
				onCommitUpdate={commitUpdate}
				onFetchedEvents={handleFetchedEvents}
				onFetchedResources={handleFetchedResources}
				onOpenCreateDialog={openCreateDialog}
				onOpenEditDialog={openEditDialog}
				onOpenEventForm={openEventForm}
				onOpenOverflowDialog={openOverflowDialog}
				onRequestScope={(target, operation, onConfirm) => {
					scopeDialog = { open: true, event: target, operation, onConfirm }
					renderTree()
				}}
				options={options}
				pluginRuntime={pluginRuntime}
				registerRefetchEvents={(fn) => {
					refetchEventsFn = fn
				}}
				registerRefetchResources={(fn) => {
					refetchResourcesFn = fn
				}}
				scopeDialog={scopeDialog}
				scrollRequest={scrollRequest}
				storedEvents={storedEvents}
			/>,
			mountHost
		)
	}

	const unsubscribe = controller.subscribe(() => {
		renderTree()
		notifySnapshot()
	})
	renderTree()
	if (Array.isArray(options.resources)) {
		reportResourcesIfChanged(options.resources)
	}

	return {
		controller,
		scrollToTime: (time: string) => {
			scrollRequest = { time }
			renderTree()
		},
		refetchEvents: () => {
			refetchEventsFn()
		},
		refetchResources: () => {
			refetchResourcesFn()
		},
		openEventForm,
		closeEventForm: closeEventDialog,
		addEvent: commitAdd,
		updateEvent: (eventId, updates) => {
			const target = storedEvents.find((item) => item.id === eventId)
			return target ? commitUpdate(target, updates, 'this') : undefined
		},
		deleteEvent: (eventId) => {
			const target = storedEvents.find((item) => item.id === eventId)
			return target ? commitDelete(target, 'this') : undefined
		},
		applyScopedEdit: (event, updates, scope) =>
			commitUpdate(event, updates, scope),
		applyScopedDelete: (event, scope) => commitDelete(event, scope),
		getEventManager: (event) => pluginRuntime.getEventManager(event),
		collectPlugin: (point, context) => pluginRuntime.collect(point, context),
		getSnapshot: () => snapshot,
		subscribeSnapshot: (listener) => {
			snapshotListeners.add(listener)
			return () => {
				snapshotListeners.delete(listener)
			}
		},
		update: (nextOptions) => {
			const prevView = options.initialView
			const prevDate = options.initialDate
			options = { ...options, ...nextOptions }
			if ('plugins' in nextOptions) {
				pluginRuntime = createPluginRuntime(nextOptions.plugins)
			}
			isUpdating = true
			try {
				controller.updateConfig(
					buildControllerPatch(
						nextOptions,
						pluginRuntime,
						controller.getState().timezone
					)
				)
				if (Array.isArray(nextOptions.events)) {
					storedEvents = [...controller.getState().events]
				}

				if (
					nextOptions.initialView !== undefined &&
					nextOptions.initialView !== prevView
				) {
					controller.setView(nextOptions.initialView)
				} else if (
					nextOptions.initialDate !== undefined &&
					nextOptions.initialDate !== prevDate
				) {
					controller.setCurrentDate(nextOptions.initialDate)
				}
			} finally {
				isUpdating = false
			}
			renderTree()
			notifySnapshot()
			if ('resources' in nextOptions && Array.isArray(nextOptions.resources)) {
				reportResourcesIfChanged(nextOptions.resources)
			}
		},
		destroy: () => {
			if (destroyed) return
			destroyed = true
			unsubscribe()
			snapshotListeners.clear()
			render(null, mountHost)
			mountHost.remove()
		},
	}
}
