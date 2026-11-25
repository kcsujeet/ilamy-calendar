import type { TranslatorFunction } from '../utils/i18n/core-translations'
import type {
	CalendarEvent,
	CalendarEventInput,
	CalendarOwnerState,
	CalendarSlotProps,
	CalendarView,
	CellInfo,
	EventSegment,
	HeadlessCalendarController,
	HeadlessCalendarState,
	IsoDateString,
	OpenEventFormInput,
	PluginDateRange,
	PluginMutationArgs,
	PluginMutationResult,
	PluginViewRangeSpec,
	Resource,
	StyleRecord,
	TimeFormat,
	ViewConfig,
} from './calendar.types'
import type { EventSlotContext, SlotMount, SlotMountHandle } from './slot.types'

export const SLOT_EVENT_FORM = 'event-form'
export const SLOT_EVENT_MUTATION_SCOPE = 'event-mutation-scope'
export const SLOT_TOOLBAR = 'toolbar'

export type PluginSlotName =
	| typeof SLOT_EVENT_FORM
	| typeof SLOT_EVENT_MUTATION_SCOPE
	| typeof SLOT_TOOLBAR
	| (string & {})

export interface PluginViewContext {
	controller: HeadlessCalendarController
	state: HeadlessCalendarState
	events: CalendarEvent[]
	ownerState: CalendarOwnerState
	t: TranslatorFunction
	slotProps?: CalendarSlotProps
	dayMaxEvents?: number
	firstDayOfWeek: number
	timezone: string
	locale: string
	timeFormat?: TimeFormat
	nowIndicator?: boolean
	disableEventClick?: boolean
	unstyled?: boolean
	openEventForm: (input?: OpenEventFormInput) => void
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (cell: CellInfo) => void
	onMoreEventsClick?: (day: IsoDateString, events: CalendarEvent[]) => void
	eventSlot?: SlotMount<EventSlotContext>
	renderEvent?: (
		container: HTMLElement,
		context: { event: CalendarEvent; segment: EventSegment }
	) => (() => void) | undefined
	getEventClassName?: (event: CalendarEvent) => string | undefined
	getEventStyle?: (event: CalendarEvent) => StyleRecord | undefined
}

export interface PluginToolbarContext {
	placement: 'desktop' | 'mobile'
	events: CalendarEvent[]
	resources: Resource[]
	currentDate: IsoDateString
	view: CalendarView
	timezone: string
	locale: string
	t: TranslatorFunction
	collect: (point: string, context: unknown) => unknown[]
	slotProps?: CalendarSlotProps
	ownerState?: CalendarOwnerState
}

export interface PluginEventFormContext {
	event: Partial<CalendarEvent>
	onChange: (updates: Partial<CalendarEvent>) => void
	rawEvents?: readonly CalendarEvent[]
	firstDayOfWeek?: number
	timezone: string
	locale: string
	t: TranslatorFunction
}

export interface PluginMutationScopeContext {
	event: CalendarEvent
	operation: 'edit' | 'delete'
	resolve: (scope: unknown) => void
	cancel: () => void
	t: TranslatorFunction
}

export interface PluginDragToCreateConfig {
	onSelect?: (
		selection: CellInfo,
		openEventForm: (input: OpenEventFormInput) => void
	) => void
}

/** Framework-agnostic view contributed by a calendar plugin. */
export interface CalendarPluginView extends PluginViewRangeSpec {
	label?: string
	supportsResources?: boolean
	headerTitle?: (date: IsoDateString, config: ViewConfig) => string
	mountView?: SlotMount<PluginViewContext>
}

/** Canonical framework-agnostic calendar plugin contract. */
export interface CalendarPlugin {
	name: string
	transformEvents?: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	normalizeEvent?: (
		event: CalendarEventInput,
		timezone: string
	) => CalendarEventInput
	managesEvent?: (event: CalendarEvent) => boolean
	applyEdit?: (
		args: PluginMutationArgs
	) => CalendarEvent[] | PluginMutationResult
	applyDelete?: (
		args: PluginMutationArgs
	) => CalendarEvent[] | PluginMutationResult
	contribute?: (point: string, context: unknown) => unknown[]
	views?: CalendarPluginView[]
	mountSlot?: (
		slotName: PluginSlotName,
		host: HTMLElement,
		context: unknown
	) => SlotMountHandle<unknown> | null
	dragToCreate?: PluginDragToCreateConfig
}

/** Core plugin runtime aggregating all registered plugins. */
export interface PluginRuntime {
	readonly plugins: readonly CalendarPlugin[]
	transformEvents: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	normalizeEvent: (
		event: CalendarEventInput,
		timezone: string
	) => CalendarEventInput
	getEventManager: (event: CalendarEvent) => CalendarPlugin | undefined
	collect: (point: string, context: unknown) => unknown[]
	getViews: () => CalendarPluginView[]
	getView: (name: string) => CalendarPluginView | undefined
	getDragToCreate: () => PluginDragToCreateConfig | undefined
}
