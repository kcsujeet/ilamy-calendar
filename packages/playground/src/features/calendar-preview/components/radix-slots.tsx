import type {
	EventFormSlotContext,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
} from '@ilamy/calendar'
import { useContext } from 'react'
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from '../../../components/ui/dialog'
import {
	MoreEventsListBody,
	PrimitiveEventFormBody,
	PrimitiveHeaderView,
	SlotPreviewOptionsContext,
} from './primitive-slot-chrome'

/** Radix UI styled calendar header slot. */
export function RadixHeaderSlot(props: HeaderSlotContext) {
	const { cssMode, hideNewButton } = useContext(SlotPreviewOptionsContext)
	return (
		<PrimitiveHeaderView
			{...props}
			cssMode={cssMode}
			hideNewButton={hideNewButton}
			variant="radix"
		/>
	)
}

/** `@radix-ui/react-dialog` event form region slot. */
export function RadixEventFormSlot(props: EventFormSlotContext) {
	const { cssMode } = useContext(SlotPreviewOptionsContext)
	const { open, event, onClose } = props
	const shadcnSuffix = cssMode === 'tailwind' ? ' (shadcn/ui)' : ''
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent data-testid="radix-event-form-dialog">
				<DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
				<p className="text-xs text-muted-foreground">
					Rendered via <code className="font-mono">slots.eventForm</code> with
					Radix UI Dialog{shadcnSuffix}
				</p>
				<PrimitiveEventFormBody {...props} prefix="radix" />
			</DialogContent>
		</Dialog>
	)
}

/** `@radix-ui/react-dialog` `+N More` events region slot. */
export function RadixMoreEventsDialogSlot({
	open,
	title,
	events,
	onEventClick,
	onClose,
}: MoreEventsDialogSlotContext) {
	const { cssMode } = useContext(SlotPreviewOptionsContext)
	const shadcnSuffix = cssMode === 'tailwind' ? ' (shadcn/ui)' : ''
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent data-testid="radix-more-events-dialog">
				<DialogTitle>{title}</DialogTitle>
				<p className="text-xs text-muted-foreground">
					Radix UI Dialog{shadcnSuffix}
				</p>
				<MoreEventsListBody
					events={events}
					onClose={onClose}
					onEventClick={onEventClick}
				/>
			</DialogContent>
		</Dialog>
	)
}
