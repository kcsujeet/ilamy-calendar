import type { ReactNode } from 'react'
import {
	type EventFormSlotContext,
	type EventMutationScopeSlotContext,
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
} from '@/components/calendar-slots'
import type {
	IlamyPlugin,
	PluginMutationArgs,
} from '@/features/plugins/lib/types'
import { RecurrenceEditDialog } from './components/recurrence-edit-dialog'
import { RecurrenceEditor } from './components/recurrence-editor/recurrence-editor'
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
	claimsEvent: (event) => isRecurringEvent(event),

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

	renderSlot: (slotName: string, context: unknown): ReactNode => {
		if (slotName === SLOT_EVENT_FORM) {
			const { event, onChange } = context as EventFormSlotContext
			return (
				<RecurrenceEditor
					onChange={(rrule) => onChange({ rrule: rrule || undefined })}
					value={event.rrule ?? null}
				/>
			)
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
