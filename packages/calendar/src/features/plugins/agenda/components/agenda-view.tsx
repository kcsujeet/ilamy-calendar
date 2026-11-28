/** @jsxImportSource preact */
import {
	type AgendaEventEntry,
	buildAgendaViewModel,
	type EventSlotContext,
	formatDate,
	now,
	type PluginViewContext,
	parseDate,
} from '@ilamy/calendar'
import { useMemo } from 'preact/hooks'
import {
	LegacyRenderHost,
	SlotHost,
} from '../../../../lib/renderer/components/slot-host'
import { resolveEventBarSurface } from '../../../../lib/renderer/utils/event-color.utils'
import { rendererKeys } from '../../../../lib/renderer/utils/keys.utils'
import type { AgendaWindow } from '../utils/agenda-window'

const formatAgendaEntryTime = (
	entry: AgendaEventEntry,
	context: PluginViewContext
): string => {
	if (entry.isAllDayLabel) return context.t('allDay')
	const edgeTime = entry.isMultiDay && entry.isLastDay ? entry.end : entry.start
	return formatDate(
		edgeTime,
		{
			hour: 'numeric',
			minute: '2-digit',
			hour12: (context.timeFormat ?? '12-hour') === '12-hour',
		},
		context.locale
	)
}

const AgendaEventTitle = ({
	entry,
	context,
}: {
	entry: AgendaEventEntry
	context: PluginViewContext
}) => {
	const segment = useMemo(
		() => ({
			isStart: entry.isFirstDay,
			isEnd: entry.isLastDay,
		}),
		[entry.isFirstDay, entry.isLastDay]
	)
	const slotCtx = useMemo<EventSlotContext>(
		() => ({
			event: entry.event,
			segment,
			view: context.state.view,
			timezone: context.timezone,
			timeFormat: context.timeFormat ?? '12-hour',
			isSelected: false,
			onClick: () => {
				if (context.disableEventClick) return
				context.onEventClick(entry.event)
				context.openEventForm(entry.event)
			},
		}),
		[entry.event, segment, context]
	)
	const legacyCtx = useMemo(
		() => ({ event: entry.event, segment }),
		[entry.event, segment]
	)

	if (context.eventSlot) {
		return (
			<SlotHost
				context={slotCtx}
				slot={context.eventSlot}
				slotKey={rendererKeys.key.eventSlot(
					entry.event.id,
					'agenda',
					segment.isStart,
					segment.isEnd
				)}
			/>
		)
	}

	if (context.renderEvent) {
		return (
			<LegacyRenderHost
				context={legacyCtx}
				renderFn={context.renderEvent}
				slotKey={rendererKeys.key.eventSlot(
					entry.event.id,
					'agenda',
					segment.isStart,
					segment.isEnd
				)}
			/>
		)
	}

	return <span data-ilamy-part="agenda-title">{entry.event.title}</span>
}

interface AgendaViewProps {
	context: PluginViewContext
	window: AgendaWindow
}

export const AgendaView = ({ context, window }: AgendaViewProps) => {
	const current =
		parseDate(context.state.currentDate, context.timezone) ??
		now(context.timezone)
	const model = buildAgendaViewModel({
		currentDate: current,
		events: context.events,
		window,
		firstDayOfWeek: context.firstDayOfWeek,
		timezone: context.timezone,
		nowIndicator: context.nowIndicator,
	})

	if (model.groups.length === 0) {
		return (
			<div data-ilamy-slot="grid-scroll" data-testid="agenda-view">
				<div data-ilamy-part="agenda-empty" data-testid="agenda-empty">
					{context.t('agendaNoEvents')}
				</div>
			</div>
		)
	}

	const hasCustomContent = Boolean(context.eventSlot || context.renderEvent)

	return (
		<div data-ilamy-slot="grid-scroll" data-testid="agenda-view">
			<div data-ilamy-part="agenda-list">
				{model.groups.map((group) => (
					<div
						data-ilamy-part="agenda-day"
						data-testid={rendererKeys.testId.agendaDay(group.key)}
						key={group.key}
					>
						<div data-ilamy-part="agenda-day-col">
							<span
								data-ilamy-part="agenda-day-num"
								data-ilamy-today-badge={group.isToday ? '' : undefined}
							>
								{group.date.day}
							</span>
							<span
								data-ilamy-part="agenda-weekday"
								data-today={group.isToday ? 'true' : undefined}
							>
								{formatDate(group.date, { weekday: 'short' }, context.locale)}
							</span>
						</div>

						<div data-ilamy-part="agenda-events-col">
							{group.nowIndicatorPercent !== null && (
								<div
									data-ilamy-slot="now-indicator"
									data-testid="now-indicator"
									style={{
										left: '0',
										right: '0',
										top: `${group.nowIndicatorPercent}%`,
									}}
								>
									<span data-ilamy-part="now-line-dot" />
									<span data-ilamy-part="now-line-bar" />
								</div>
							)}

							{group.entries.map((entry) => {
								const evt = entry.event
								const surface = resolveEventBarSurface(
									evt,
									Boolean(context.unstyled),
									false
								)
								const dotBg = !context.unstyled
									? surface.style?.backgroundColor
									: undefined
								return (
									<button
										data-event-id={String(evt.id)}
										data-ilamy-part="agenda-row"
										data-testid={rendererKeys.testId.agendaEvent(evt.id)}
										key={rendererKeys.key.agendaEntry(
											evt.id,
											entry.start.toString()
										)}
										onClick={() => {
											if (context.disableEventClick) return
											context.onEventClick(evt)
											context.openEventForm(evt)
										}}
										type="button"
									>
										<span data-ilamy-part="agenda-time">
											{formatAgendaEntryTime(entry, context)}
										</span>
										<span
											className={surface.className}
											data-ilamy-part="agenda-dot"
											style={
												!surface.className && dotBg
													? { backgroundColor: String(dotBg) }
													: undefined
											}
										/>
										<AgendaEventTitle context={context} entry={entry} />
										{!hasCustomContent && entry.isMultiDay && (
											<span data-ilamy-part="agenda-badge">
												(Day {entry.dayIndex}/{entry.totalDays})
											</span>
										)}
									</button>
								)
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
