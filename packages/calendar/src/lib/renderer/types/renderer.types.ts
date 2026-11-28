import type {
	CalendarOwnerState,
	CellInfo,
	DomCalendarEvent,
	DomCalendarEventInput,
	DomMutationScope,
	EventDelta,
	IsoDateString,
	OpenEventFormInput,
	PluginRuntime,
	TranslatorFunction,
} from '../../../index'

export type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomEventFormRenderContext,
	DomEventRenderContext,
	DomHeaderRenderContext,
	DomMutationScope,
	DomRenderCleanup,
	DomResourceRenderContext,
	MountedCalendar,
	RenderCurrentTimeIndicatorProps,
} from '../../../index'

export interface RendererActions {
	ownerState: CalendarOwnerState
	t: TranslatorFunction
	pluginRuntime: PluginRuntime
	rawEvents: readonly DomCalendarEvent[]
	openCreateDialog: (cell?: CellInfo) => void
	openEventForm: (input?: OpenEventFormInput) => void
	openEditDialog: (event: DomCalendarEvent) => void
	openOverflowDialog: (
		dateIso: IsoDateString,
		title: string,
		events: DomCalendarEvent[]
	) => void
	commitAdd: (input: DomCalendarEventInput) => DomCalendarEvent
	commitUpdate: (
		event: DomCalendarEvent,
		updates: Partial<DomCalendarEventInput>,
		scope?: DomMutationScope,
		deltas?: {
			delta?: EventDelta
			endDelta?: EventDelta
		}
	) => DomCalendarEvent | undefined
	commitDelete: (
		event: DomCalendarEvent,
		scope?: DomMutationScope
	) => DomCalendarEvent | undefined
}
