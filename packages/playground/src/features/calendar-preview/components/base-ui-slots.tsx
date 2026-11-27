import { Dialog } from '@base-ui/react/dialog'
import type {
	EventFormSlotContext,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
} from '@ilamy/calendar'
import { XIcon } from 'lucide-react'
import { type ReactNode, useContext } from 'react'
import {
	MoreEventsListBody,
	PrimitiveEventFormBody,
	PrimitiveHeaderView,
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

/** Base UI styled calendar header slot. */
export function BaseUiHeaderSlot(props: HeaderSlotContext) {
	const { cssMode, hideNewButton } = useContext(SlotPreviewOptionsContext)
	return (
		<PrimitiveHeaderView
			{...props}
			cssMode={cssMode}
			hideNewButton={hideNewButton}
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
