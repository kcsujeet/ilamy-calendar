import type { CalendarEvent } from '@ilamy/types'
import type { EventMutationScopeSlot } from '@/components/calendar-slots'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'

type ScopeDialogProps = React.ComponentProps<typeof EventMutationScopeSlot>

interface DropCommit {
	/** Writes a finished drop, or asks the owning plugin for a scope first. */
	commitDrop: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void
	/** Props for the scope dialog the owning plugin renders. */
	scopeDialog: ScopeDialogProps
}

/**
 * How a finished drop reaches the calendar's state. An event owned by a plugin
 * (a recurring instance, say) cannot simply be written: the owner has to ask
 * which occurrences the edit applies to first.
 */
export const useDropCommit = (): DropCommit => {
	const { updateEvent, getEventManager } = useSmartCalendarContext(
		(context) => ({
			updateEvent: context.updateEvent,
			getEventManager: context.getEventManager,
		})
	)
	const { dialogState, openEditDialog, closeDialog, handleConfirm } =
		useScopedEventMutation()

	const commitDrop = (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>
	) => {
		const hasNoUpdates = Object.keys(updates ?? {}).length === 0
		if (!event?.id || hasNoUpdates) {
			return
		}

		const owner = getEventManager(event)
		if (owner?.applyEdit) {
			// Owned events route through the owner's scoped mutation flow: prompt
			// for scope (the owner renders the eventMutationScope slot), then apply.
			openEditDialog(event, updates)
			return
		}

		updateEvent(event.id, updates)
	}

	return {
		commitDrop,
		scopeDialog: {
			dialog: dialogState,
			onCancel: closeDialog,
			onResolve: handleConfirm,
		},
	}
}
