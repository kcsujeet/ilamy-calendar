import type { IlamyPlugin } from '@/lib/plugin'
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
 * Built-in recurrence plugin. Implements the IlamyPlugin contract by delegating
 * to the existing recurrence handler functions and editor components.
 */
export const recurrencePlugin = (): IlamyPlugin => ({
	name: 'recurrence',

	// Matches the previous `isRecurringEvent` gate exactly (rrule, recurrenceId,
	// or uid) so drag/edit routing behaves identically. `expandEvent` is narrower
	// (rrule only) since only base events generate occurrences.
	ownsEvent: (event) => isRecurringEvent(event),

	expandEvent: (event, range, allEvents) => {
		if (!event.rrule) {
			return null
		}
		// `allEvents` is required so generateRecurringEvents can find this series'
		// detached overrides and merge/skip them (parity with the old engine).
		return generateRecurringEvents({
			event,
			currentEvents: allEvents,
			startDate: range.start,
			endDate: range.end,
		})
	},

	applyEdit: ({ event, updates, currentEvents, scope }) =>
		updateRecurringEvent({
			targetEvent: event,
			updates,
			currentEvents,
			scope: scope as RecurrenceEditScope,
		}),

	applyDelete: ({ event, currentEvents, scope }) =>
		deleteRecurringEvent({
			targetEvent: event,
			currentEvents,
			scope: scope as RecurrenceEditScope,
		}),

	renderEditDialog: ({ event, operation, onConfirm, onCancel }) => (
		<RecurrenceEditDialog
			eventTitle={event.title || ''}
			isOpen={true}
			onClose={onCancel}
			onConfirm={(scope: RecurrenceEditScope) => onConfirm(scope)}
			operationType={operation}
		/>
	),

	renderFormSection: ({ event, onChange }) => (
		<RecurrenceEditor
			onChange={(rrule) => onChange({ rrule: rrule || undefined })}
			value={event.rrule ?? null}
		/>
	),
})
