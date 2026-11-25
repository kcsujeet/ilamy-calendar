/** @jsxImportSource react */
import { type ComponentType, createElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type {
	CalendarEvent,
	CalendarSlots,
	EventFormSlotContext,
	IsoDateString,
	RenderCurrentTimeIndicatorProps,
	SlotContextMap,
	SlotMount,
	SlotName,
} from '../../../index'
import type { IlamyCalendarProps, ReactCalendarSlots } from './types'

export type PortalKind =
	| SlotName
	| 'legacyHeader'
	| 'legacyEvent'
	| 'legacyResource'
	| 'legacyEventForm'
	| 'legacyHour'
	| 'legacyNowIndicator'

export interface PortalEntry {
	id: string
	kind: PortalKind
	host: HTMLElement
	context: unknown
}

export interface PortalRegistry {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => readonly PortalEntry[]
	getServerSnapshot: () => readonly PortalEntry[]
	upsert: (entry: PortalEntry) => void
	updateProps: (id: string, context: unknown) => void
	remove: (id: string) => void
	clear: () => void
}

const EMPTY_PORTALS: readonly PortalEntry[] = []

export const createPortalRegistry = (): PortalRegistry => {
	const entries = new Map<string, PortalEntry>()
	const listeners = new Set<() => void>()
	let snapshot: readonly PortalEntry[] = EMPTY_PORTALS

	const notify = () => {
		snapshot = Array.from(entries.values())
		for (const listener of listeners) {
			listener()
		}
	}

	return {
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		getSnapshot: () => snapshot,
		getServerSnapshot: () => EMPTY_PORTALS,
		upsert: (entry) => {
			entries.set(entry.id, entry)
			notify()
		},
		updateProps: (id, context) => {
			const existing = entries.get(id)
			if (!existing) return
			entries.set(id, { ...existing, context })
			notify()
		},
		remove: (id) => {
			if (!entries.delete(id)) return
			notify()
		},
		clear: () => {
			if (entries.size === 0) return
			entries.clear()
			notify()
		},
	}
}

const SLOT_NAMES: readonly SlotName[] = [
	'header',
	'event',
	'resource',
	'eventForm',
	'moreEventsDialog',
	'recurrenceScopeDialog',
]

export type SlotMountCache = Partial<{
	[K in PortalKind]: SlotMount<never>
}>

const getOrCreateSlotMount = <K extends PortalKind>(
	cache: SlotMountCache,
	registry: PortalRegistry,
	counter: { current: number },
	kind: K
): SlotMount<unknown> => {
	if (!cache[kind]) {
		cache[kind] = {
			mount: (host: HTMLElement, props: unknown) => {
				counter.current += 1
				const id = `${kind}-${counter.current}`
				registry.upsert({ id, kind, host, context: props })
				return {
					update: (nextProps: unknown) => registry.updateProps(id, nextProps),
					destroy: () => registry.remove(id),
				}
			},
		} as SlotMount<never>
	}
	return cache[kind] as SlotMount<unknown>
}

/**
 * Resolves stable `SlotMount` objects for declarative React region `slots` and
 * React legacy element/render callbacks (`headerComponent`, `renderEvent`,
 * `renderResource`, `renderEventForm`).
 */
export const resolveReactCalendarSlots = ({
	slots,
	hasHeaderComponent,
	hasRenderEvent,
	hasRenderResource,
	hasRenderEventForm,
	cache,
	registry,
	counter,
}: {
	slots: ReactCalendarSlots | undefined
	hasHeaderComponent: boolean
	hasRenderEvent: boolean
	hasRenderResource: boolean
	hasRenderEventForm: boolean
	cache: SlotMountCache
	registry: PortalRegistry
	counter: { current: number }
}): CalendarSlots => {
	const mapped: CalendarSlots = {}
	for (const name of SLOT_NAMES) {
		if (!slots?.[name]) continue
		Object.assign(mapped, {
			[name]: getOrCreateSlotMount(cache, registry, counter, name),
		})
	}
	if (!mapped.header && hasHeaderComponent) {
		mapped.header = getOrCreateSlotMount(
			cache,
			registry,
			counter,
			'legacyHeader'
		) as CalendarSlots['header']
	}
	if (!mapped.event && hasRenderEvent) {
		mapped.event = getOrCreateSlotMount(
			cache,
			registry,
			counter,
			'legacyEvent'
		) as CalendarSlots['event']
	}
	if (!mapped.resource && hasRenderResource) {
		mapped.resource = getOrCreateSlotMount(
			cache,
			registry,
			counter,
			'legacyResource'
		) as CalendarSlots['resource']
	}
	if (!mapped.eventForm && hasRenderEventForm) {
		mapped.eventForm = getOrCreateSlotMount(
			cache,
			registry,
			counter,
			'legacyEventForm'
		) as CalendarSlots['eventForm']
	}
	return mapped
}

/**
 * Creates a stable `renderHost(container, ctx)` bridge backed by the portal
 * registry so legacy `renderHour` and `renderCurrentTimeIndicator` preserve React Context.
 */
export const createCallbackPortalBridge = <Ctx>(
	registry: PortalRegistry,
	counter: { current: number },
	kind: 'legacyHour' | 'legacyNowIndicator'
) => {
	return (container: HTMLElement, ctx: Ctx): (() => void) => {
		counter.current += 1
		const id = `${kind}-${counter.current}`
		registry.upsert({ id, kind, host: container, context: ctx })
		return () => {
			registry.remove(id)
		}
	}
}

const renderLegacyFormPortal = (
	ctx: EventFormSlotContext,
	renderEventForm: NonNullable<IlamyCalendarProps['renderEventForm']>
): ReactNode =>
	renderEventForm({
		open: ctx.open,
		selectedEvent: ctx.event,
		onAdd: (evt) => ctx.onAdd(evt),
		onUpdate: (evt) => {
			const targetId = evt.id ?? ctx.event?.id
			if (targetId !== undefined) {
				ctx.onUpdate(targetId, evt)
			}
		},
		onDelete: ctx.onDelete
			? (evt: CalendarEvent) => ctx.onDelete?.(evt.id)
			: undefined,
		onClose: ctx.onClose,
	})

type LegacyPortalProps = Pick<
	IlamyCalendarProps,
	| 'headerComponent'
	| 'renderEvent'
	| 'renderResource'
	| 'renderEventForm'
	| 'renderHour'
	| 'renderCurrentTimeIndicator'
>

const LEGACY_PORTAL_RENDERERS: Record<
	string,
	((entry: PortalEntry, props: LegacyPortalProps) => ReactNode) | undefined
> = {
	legacyHeader: (_entry, props) => props.headerComponent ?? null,
	legacyEvent: (entry, props) => {
		const ctx = entry.context as SlotContextMap['event']
		return props.renderEvent?.(ctx.event, ctx.segment) ?? null
	},
	legacyResource: (entry, props) => {
		const ctx = entry.context as SlotContextMap['resource']
		return props.renderResource?.(ctx.resource) ?? null
	},
	legacyEventForm: (entry, props) =>
		props.renderEventForm
			? renderLegacyFormPortal(
					entry.context as EventFormSlotContext,
					props.renderEventForm
				)
			: null,
	legacyHour: (entry, props) =>
		props.renderHour?.(entry.context as IsoDateString) ?? null,
	legacyNowIndicator: (entry, props) =>
		props.renderCurrentTimeIndicator?.(
			entry.context as RenderCurrentTimeIndicatorProps
		) ?? null,
}

const renderLegacyPortal = (
	entry: PortalEntry,
	props: LegacyPortalProps
): ReactNode => LEGACY_PORTAL_RENDERERS[entry.kind]?.(entry, props) ?? null

/** Renders one registered portal entry purely from current React props (never from refs). */
export const renderPortalEntry = (
	entry: PortalEntry,
	props: Pick<
		IlamyCalendarProps,
		| 'slots'
		| 'headerComponent'
		| 'renderEvent'
		| 'renderResource'
		| 'renderEventForm'
		| 'renderHour'
		| 'renderCurrentTimeIndicator'
	>
): ReactNode => {
	if (entry.kind.startsWith('legacy')) {
		const content = renderLegacyPortal(entry, props)
		return content === null ? null : createPortal(content, entry.host, entry.id)
	}
	const slotName = entry.kind as SlotName
	const SlotComponent = props.slots?.[slotName] as
		ComponentType<Record<string, unknown>> | undefined
	if (!SlotComponent) return null
	return createPortal(
		createElement(SlotComponent, entry.context as Record<string, unknown>),
		entry.host,
		entry.id
	)
}
