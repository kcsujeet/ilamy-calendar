import type {
	EventFormSlotContext,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
	RecurrenceScopeDialogSlotContext,
} from '@ilamy/calendar'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown } from 'lucide-react'
import { useContext, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from '../../../components/ui/dialog'
import { HeaderDatePickerGrid } from './header-date-picker-grid'
import {
	MoreEventsListBody,
	PrimitiveEventFormBody,
	PrimitiveHeaderView,
	RecurrenceScopeListBody,
	SlotPreviewOptionsContext,
} from './primitive-slot-chrome'

/** Radix UI styled calendar header slot with a `@radix-ui/react-popover` date selector. */
export function RadixHeaderSlot(props: HeaderSlotContext) {
	const { cssMode, hideNewButton } = useContext(SlotPreviewOptionsContext)
	const [open, setOpen] = useState(false)
	const { currentDate, locale, selectDate, timezone, title, view } = props

	return (
		<PrimitiveHeaderView
			{...props}
			cssMode={cssMode}
			hideNewButton={hideNewButton}
			renderDatePicker={(triggerClassName) => (
				<Popover.Root onOpenChange={setOpen} open={open}>
					<Popover.Trigger asChild>
						<button
							aria-expanded={open}
							aria-haspopup="dialog"
							className={triggerClassName}
							data-testid="calendar-title"
							type="button"
						>
							<span>{title}</span>
							<ChevronDown className="size-3.5 opacity-60" />
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							align="start"
							className="z-50 rounded-lg border border-border bg-background p-3 text-foreground shadow-lg outline-hidden"
							data-testid="radix-date-picker-popover"
							sideOffset={6}
						>
							<HeaderDatePickerGrid
								currentDate={currentDate}
								locale={locale}
								onSelectDate={(iso) => {
									selectDate(iso)
									setOpen(false)
								}}
								timezone={timezone}
								view={view}
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			)}
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

/** `@radix-ui/react-dialog` recurring scope prompt region slot. */
export function RadixRecurrenceScopeDialogSlot({
	open,
	event,
	operation,
	onConfirm,
	onCancel,
	t,
}: RecurrenceScopeDialogSlotContext) {
	const { cssMode } = useContext(SlotPreviewOptionsContext)
	const shadcnSuffix = cssMode === 'tailwind' ? ' (shadcn/ui)' : ''
	const isEdit = operation === 'edit'
	const titleText = t(isEdit ? 'editRecurringEvent' : 'deleteRecurringEvent')
	const question = t(
		isEdit ? 'editRecurringEventQuestion' : 'deleteRecurringEventQuestion'
	)
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
			<DialogContent data-testid="radix-recurrence-scope-dialog">
				<DialogTitle>{titleText}</DialogTitle>
				<p className="text-xs text-muted-foreground">
					&ldquo;{event?.title}&rdquo; {question} · Radix UI Dialog
					{shadcnSuffix}
				</p>
				<RecurrenceScopeListBody
					onCancel={onCancel}
					onConfirm={onConfirm}
					operation={operation}
					t={t}
				/>
			</DialogContent>
		</Dialog>
	)
}
