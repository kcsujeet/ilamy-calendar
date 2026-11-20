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

export const recurrencePlugin = (): IlamyPlugin => ({
	name: 'recurrence',

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
					timezone: range.timezone,
				})
			}

			if (event.recurrenceId) {
				const baseEvent = baseBySeriesUid.get(getEventParentUID(event))
				if (baseEvent) {
					return [{ ...baseEvent, ...event, rrule: undefined }]
				}
			}

			return [event]
		})
	},

	managesEvent: (event) => isRecurringEvent(event),

	applyEdit: ({
		event,
		updates,
		currentEvents,
		scope,
		timezone,
	}: PluginMutationArgs) =>
		updateRecurringEvent({
			targetEvent: event,
			updates: updates ?? {},
			currentEvents,
			scope: scope as RecurrenceEditScope,
			timezone,
		}),

	applyDelete: ({
		event,
		currentEvents,
		scope,
		timezone,
	}: PluginMutationArgs) =>
		deleteRecurringEvent({
			targetEvent: event,
			currentEvents,
			scope: scope as RecurrenceEditScope,
			timezone,
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
