import type { ReactNode } from 'react'
import type { ScopedMutationDialogState } from '@/hooks/use-scoped-event-mutation'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { CalendarEvent } from './types'

/**
 * The calendar's plugin mount points. These belong to the host (the components
 * that render them: the event form and the drag-and-drop flow), NOT to the
 * plugin kernel and NOT to any individual plugin. The kernel's `renderSlot`
 * takes a plain `slotName: string` and knows nothing about this list; the core
 * renders these named slots and any plugin may fill the ones it cares about.
 */
export const SLOT_EVENT_FORM = 'event-form'
export const SLOT_EVENT_MUTATION_SCOPE = 'event-mutation-scope'

/** Context passed to the `event-form` slot (inside the create/edit form). */
export interface EventFormSlotContext {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

/**
 * Context passed to the `event-mutation-scope` slot. The owning plugin renders
 * UI to gather its opaque `scope`, then calls `resolve(scope)` (or `cancel`).
 */
export interface EventMutationScopeSlotContext {
	event: CalendarEvent
	operation: 'edit' | 'delete'
	resolve: (scope: unknown) => void
	cancel: () => void
}

/**
 * Renders the plugin-contributed sections of the event form (e.g. the
 * recurrence editor). Every plugin that fills the `event-form` slot appears
 * here; with no such plugin this renders nothing.
 */
export const EventFormSlot = ({
	event,
	onChange,
}: EventFormSlotContext): ReactNode => {
	const renderSlot = useSmartCalendarContext((context) => context.renderSlot)
	return renderSlot(SLOT_EVENT_FORM, { event, onChange })
}

interface EventMutationScopeSlotProps {
	dialog: ScopedMutationDialogState
	onResolve: (scope: unknown) => void
	onCancel: () => void
}

/**
 * Renders the owning plugin's scope picker (this / following / all) while a
 * scoped edit or delete is in progress. Renders nothing when the dialog is
 * closed or no plugin owns the event.
 */
export const EventMutationScopeSlot = ({
	dialog,
	onResolve,
	onCancel,
}: EventMutationScopeSlotProps): ReactNode => {
	const getEventManager = useSmartCalendarContext(
		(context) => context.getEventManager
	)
	if (!(dialog.isOpen && dialog.event)) {
		return null
	}
	const manager = getEventManager(dialog.event)
	const context: EventMutationScopeSlotContext = {
		event: dialog.event,
		operation: dialog.operation,
		resolve: onResolve,
		cancel: onCancel,
	}
	return manager?.renderSlot?.(SLOT_EVENT_MUTATION_SCOPE, context)
}
