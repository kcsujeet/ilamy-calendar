import './augment'
import type {
	CalendarEvent,
	EventFormSlotContext,
	EventMutationScopeSlotContext,
	IlamyPlugin,
	PluginMutationArgs,
} from '@ilamy/calendar'
import { SLOT_EVENT_FORM, SLOT_EVENT_MUTATION_SCOPE } from '@ilamy/calendar'
import type { ReactNode } from 'react'
import { RecurrenceEditDialog } from './components/recurrence-edit-dialog/recurrence-edit-dialog'
import { RecurrenceFormSection } from './components/recurrence-form-section'
import { recurrenceICalProperties } from './ical'
import type { RecurrenceEditScope } from './types'
import { deleteRecurringEvent } from './utils/delete-recurring-event'
import { generateRecurringEvents } from './utils/generate-recurring-events'
import { getEventParentUID, isRecurringEvent } from './utils/series-helpers'
import { updateRecurringEvent } from './utils/update-recurring-event'

/**
 * Built-in recurrence plugin. Implements the generic IlamyPlugin contract by
 * delegating to the existing recurrence handler functions and editor
 * components.
 */
export const recurrencePlugin = (): IlamyPlugin => ({
	name: 'recurrence',

	// Expand each base (rrule) event into its in-range instances. The expansion
	// SKIPS occurrences that have a detached override; the override is emitted
	// here instead, exactly once, merged over its base. Emitting it from both
	// places put a moved override on the grid twice. Plain events pass through.
	transformEvents: (events, range) => {
		const baseBySeriesUid = new Map<string, CalendarEvent>()
		for (const event of events) {
			if (event.rrule) {
				baseBySeriesUid.set(getEventParentUID(event), event)
			}
		}

		return events.flatMap((event) => {
			if (event.rrule) {
				return generateRecurringEvents({
					event,
					currentEvents: events,
					startDate: range.start,
					endDate: range.end,
				})
			}

			// Merging over the base keeps the fields an override omits — an
			// imported VEVENT carries only what it changes. `rrule` is forced off:
			// an override is an instance, and a sparse one has no key of its own to
			// shadow the base's.
			if (event.recurrenceId) {
				const baseEvent = baseBySeriesUid.get(getEventParentUID(event))
				if (baseEvent) {
					return [{ ...baseEvent, ...event, rrule: undefined }]
				}
			}

			return [event]
		})
	},

	// Mirrors the previous `isRecurringEvent` gate (rrule, recurrenceId, or uid)
	// so drag/edit routing is unchanged.
	managesEvent: (event) => isRecurringEvent(event),

	applyEdit: ({ event, updates, currentEvents, scope }: PluginMutationArgs) =>
		updateRecurringEvent({
			targetEvent: event,
			updates: updates ?? {},
			currentEvents,
			scope: scope as RecurrenceEditScope,
		}),

	applyDelete: ({ event, currentEvents, scope }: PluginMutationArgs) =>
		deleteRecurringEvent({
			targetEvent: event,
			currentEvents,
			scope: scope as RecurrenceEditScope,
		}),

	contribute: (point: string, context: unknown): unknown[] => {
		if (point !== 'ical:vevent-properties') {
			return []
		}
		return recurrenceICalProperties(context as CalendarEvent)
	},

	renderSlot: (slotName: string, context: unknown): ReactNode => {
		if (slotName === SLOT_EVENT_FORM) {
			const { event, onChange } = context as EventFormSlotContext
			return <RecurrenceFormSection event={event} onChange={onChange} />
		}
		if (slotName === SLOT_EVENT_MUTATION_SCOPE) {
			const { event, operation, resolve, cancel } =
				context as EventMutationScopeSlotContext
			return (
				<RecurrenceEditDialog
					eventTitle={event.title || ''}
					isOpen={true}
					onClose={cancel}
					onConfirm={(scope: RecurrenceEditScope) => resolve(scope)}
					operationType={operation}
				/>
			)
		}
		return null
	},
})
