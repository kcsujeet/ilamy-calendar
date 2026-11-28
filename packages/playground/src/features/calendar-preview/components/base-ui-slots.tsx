import { Dialog } from '@base-ui/react/dialog'
import { Popover } from '@base-ui/react/popover'
import type {
	EventFormSlotContext,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
	RecurrenceScopeDialogSlotContext,
} from '@ilamy/calendar'
import { ChevronDown, XIcon } from 'lucide-react'
import { type ReactNode, useContext, useState } from 'react'
import { HeaderDatePickerGrid } from './header-date-picker-grid'
import {
	MoreEventsListBody,
	PrimitiveEventFormBody,
	PrimitiveHeaderView,
	RecurrenceScopeListBody,
	SlotPreviewOptionsContext,
} from './primitive-slot-chrome'

function BaseUiDialogShell({
	open,
	onClose,
	title,
	subtitle,
	testId,
	children,
}: {
	open: boolean
	onClose: () => void
	title: string
	subtitle: ReactNode
	testId: string
	children: ReactNode
}) {
	return (
		<Dialog.Root
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose()
			}}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
				<Dialog.Popup
					className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] sm:max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-foreground shadow-lg"
					data-testid={testId}
				>
					<Dialog.Title className="text-lg leading-none font-semibold">
						{title}
					</Dialog.Title>
					<p className="text-xs text-muted-foreground">{subtitle}</p>
					{children}
					<Dialog.Close
						aria-label="Close"
						className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
					>
						<XIcon className="size-4" />
					</Dialog.Close>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

/** Base UI styled calendar header slot with a `@base-ui/react/popover` date selector. */
export function BaseUiHeaderSlot(props: HeaderSlotContext) {
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
					<Popover.Trigger
						aria-expanded={open}
						aria-haspopup="dialog"
						className={triggerClassName}
						data-testid="calendar-title"
					>
						<span>{title}</span>
						<ChevronDown className="size-3.5 opacity-60" />
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Positioner align="start" className="z-50" sideOffset={6}>
							<Popover.Popup
								className="rounded-xl border border-border bg-background p-3 text-foreground shadow-lg outline-hidden"
								data-testid="base-ui-date-picker-popover"
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
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			)}
			variant="base-ui"
		/>
	)
}

/** `@base-ui/react/dialog` event form region slot. */
export function BaseUiEventFormSlot(props: EventFormSlotContext) {
	const { cssMode } = useContext(SlotPreviewOptionsContext)
	const { open, event, onClose } = props
	const shadcnSuffix = cssMode === 'tailwind' ? ' (shadcn/ui)' : ''
	return (
		<BaseUiDialogShell
			onClose={onClose}
			open={open}
			subtitle={
				<>
					Rendered via <code className="font-mono">slots.eventForm</code> with{' '}
					<code className="font-mono">@base-ui/react/dialog</code>
					{shadcnSuffix}
				</>
			}
			testId="base-ui-event-form-dialog"
			title={event ? 'Edit Event' : 'Create Event'}
		>
			<PrimitiveEventFormBody {...props} prefix="base-ui" />
		</BaseUiDialogShell>
	)
}

/** `@base-ui/react/dialog` `+N More` events region slot. */
export function BaseUiMoreEventsDialogSlot({
	open,
	title,
	events,
	onEventClick,
	onClose,
}: MoreEventsDialogSlotContext) {
	const { cssMode } = useContext(SlotPreviewOptionsContext)
	const shadcnSuffix = cssMode === 'tailwind' ? ' (shadcn/ui)' : ''
	return (
		<BaseUiDialogShell
			onClose={onClose}
			open={open}
			subtitle={
				<>
					Rendered with <code className="font-mono">@base-ui/react/dialog</code>
					{shadcnSuffix}
				</>
			}
			testId="base-ui-more-events-dialog"
			title={title}
		>
			<MoreEventsListBody
				events={events}
				onClose={onClose}
				onEventClick={onEventClick}
			/>
		</BaseUiDialogShell>
	)
}

/** `@base-ui/react/dialog` recurring scope prompt region slot. */
export function BaseUiRecurrenceScopeDialogSlot({
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
		<BaseUiDialogShell
			onClose={onCancel}
			open={open}
			subtitle={
				<>
					&ldquo;{event?.title}&rdquo; {question} ·{' '}
					<code className="font-mono">@base-ui/react/dialog</code>
					{shadcnSuffix}
				</>
			}
			testId="base-ui-recurrence-scope-dialog"
			title={titleText}
		>
			<RecurrenceScopeListBody
				onCancel={onCancel}
				onConfirm={onConfirm}
				operation={operation}
				t={t}
			/>
		</BaseUiDialogShell>
	)
}
