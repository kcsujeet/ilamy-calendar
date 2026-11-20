import type {
	EventFormSlotContext,
	EventMutationScopeSlotContext,
	ToolbarSlotContext,
} from '@ilamy/types'
import type { ReactNode } from 'react'
import type { ScopedMutationDialogState } from '@/features/calendar/hooks/use-scoped-event-mutation'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

export const SLOT_EVENT_FORM = 'event-form'
export const SLOT_EVENT_MUTATION_SCOPE = 'event-mutation-scope'
export const SLOT_TOOLBAR = 'toolbar'

export const EventFormSlot = ({
	event,
	onChange,
}: EventFormSlotContext): ReactNode => {
	const renderSlot = useSmartCalendarContext((context) => context.renderSlot)
	return renderSlot(SLOT_EVENT_FORM, { event, onChange })
}

export const ToolbarSlot = ({ placement }: ToolbarSlotContext): ReactNode => {
	const renderSlot = useSmartCalendarContext((context) => context.renderSlot)
	return renderSlot(SLOT_TOOLBAR, { placement })
}

interface EventMutationScopeSlotProps {
	dialog: ScopedMutationDialogState
	onResolve: (scope: unknown) => void
	onCancel: () => void
}

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
