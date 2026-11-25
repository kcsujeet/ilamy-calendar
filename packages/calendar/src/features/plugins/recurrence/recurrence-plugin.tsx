/** @jsxImportSource preact */
import './augment'
import {
	type CalendarEvent,
	type CalendarPlugin,
	type PluginEventFormContext,
	type PluginMutationArgs,
	type PluginMutationScopeContext,
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
} from '@ilamy/calendar'
import { mountPreactSlot } from '../../../lib/renderer/utils/preact-slot.utils'
import { RecurrenceEditDialog } from './components/recurrence-edit-dialog/recurrence-edit-dialog'
import { RecurrenceFormSection } from './components/recurrence-form-section'
import { recurrenceICalProperties } from './ical'
import type { RecurrenceEditScope } from './types'
import { deleteRecurringEvent } from './utils/delete-recurring-event'
import { generateRecurringEvents } from './utils/generate-recurring-events'
import { getEventParentUID, isRecurringEvent } from './utils/series-helpers'
import { updateRecurringEvent } from './utils/update-recurring-event'

export const recurrencePlugin = (): CalendarPlugin => ({
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

	mountSlot: (slotName, host, context) => {
		if (slotName === SLOT_EVENT_FORM) {
			return mountPreactSlot(
				host,
				(ctx) => (
					<RecurrenceFormSection context={ctx as PluginEventFormContext} />
				),
				context
			)
		}
		if (slotName === SLOT_EVENT_MUTATION_SCOPE) {
			let settled = false
			return mountPreactSlot(
				host,
				(rawCtx) => {
					const { event, operation, resolve, cancel, t } =
						rawCtx as PluginMutationScopeContext
					settled = false
					return (
						<RecurrenceEditDialog
							eventTitle={event.title || ''}
							isOpen={true}
							onClose={() => {
								if (!settled) cancel()
							}}
							onConfirm={(scope: RecurrenceEditScope) => {
								settled = true
								resolve(scope)
							}}
							operationType={operation}
							t={t}
						/>
					)
				},
				context
			)
		}
		return null
	},
})
