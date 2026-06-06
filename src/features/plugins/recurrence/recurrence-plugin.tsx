import './augment'
import {
	type CalendarEvent,
	type EventFormSlotContext,
	type EventMutationScopeSlotContext,
	type IlamyPlugin,
	type PluginMutationArgs,
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
} from '@ilamy/calendar'
import type { ReactNode } from 'react'
import { RecurrenceEditDialog } from './components/recurrence-edit-dialog'
import { RecurrenceFormSection } from './components/recurrence-form-section'
import { recurrenceICalProperties } from './ical'
import type { RecurrenceEditScope } from './types'
import {
	deleteRecurringEvent,
	generateRecurringEvents,
	isRecurringEvent,
	updateRecurringEvent,
} from './utils/recurrence-handler'

/**
 * Built-in recurrence plugin. Implements the generic IlamyPlugin contract by
 * delegating to the existing recurrence handler functions and editor
 * components.
 */
export const recurrencePlugin = (): IlamyPlugin => ({
	name: 'recurrence',

	// Expand each base (rrule) event into its in-range instances, merging any
	// detached overrides found in the full list. Non-base events (plain events,
	// modified instances) pass through untouched.
	transformEvents: (events, range) =>
		events.flatMap((event) =>
			event.rrule
				? generateRecurringEvents({
						event,
						currentEvents: events,
						startDate: range.start,
						endDate: range.end,
					})
				: [event]
		),

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

	contribute: (point: string, context: unknown): unknown[] =>
		point === 'ical:vevent-properties'
			? recurrenceICalProperties(context as CalendarEvent)
			: [],

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
