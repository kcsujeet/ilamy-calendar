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
