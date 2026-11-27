/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks'
import type {
	HeadlessCalendarController,
	IsoDateString,
	MoreEventsDialogSlotContext,
} from '../../../../index'
import { DialogShell } from '../../components/dialog-shell'
import { SlotHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RendererActions,
} from '../../types/renderer.types'
import type { CalendarFormatters } from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import { EventBar } from '../views/event-bar'

export interface MoreEventsDialogState {
	open: boolean
	dateIso: IsoDateString
	title: string
	events: DomCalendarEvent[]
}

interface MoreEventsDialogProps {
	state: MoreEventsDialogState
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	onClose: () => void
}

export const MoreEventsDialog = ({
	state,
	controller,
	options,
	actions,
	formatters,
	onClose,
}: MoreEventsDialogProps) => {
	const slotContext = useMemo<MoreEventsDialogSlotContext>(
		() => ({
			open: state.open,
			date: state.dateIso,
			title: state.title,
			events: state.events,
			onEventClick: (evt) => {
				if (options.disableEventClick) return
				const domEvt = evt as DomCalendarEvent
				options.onEventClick?.(domEvt)
				actions.openEditDialog(domEvt)
			},
			onClose,
			t: actions.t,
		}),
		[state, options, actions, onClose]
	)

	if (options.slots?.moreEventsDialog) {
		return (
			<SlotHost
				context={slotContext}
				slot={options.slots.moreEventsDialog}
				slotKey="moreEventsDialog"
			/>
		)
	}

	if (!state.open) return null

	return (
		<DialogShell
			maxWidth="440px"
			onClose={onClose}
			open={state.open}
			testId="dom-overflow-dialog"
			title={state.title}
		>
			<div data-ilamy-part="overflow-list">
				{state.events.map((event) => (
					<div
						key={rendererKeys.key.dialogEvent(event.id, event.start)}
						style={{ height: '24px' }}
					>
						<EventBar
							actions={actions}
							axis="horizontal"
							compact
							controller={controller}
							event={event}
							formatters={formatters}
							onPillClick={() => {
								if (options.disableEventClick) return
								options.onEventClick?.(event)
								actions.openEditDialog(event)
							}}
							options={options}
							staticPill
						/>
					</div>
				))}
			</div>
		</DialogShell>
	)
}
