/** @jsxImportSource preact */
import {
	buildYearViewModel,
	formatDate,
	now,
	type PluginViewContext,
	parseDate,
	toOffsetIso,
} from '@ilamy/calendar'
import { rendererKeys } from '../../../lib/renderer/utils/keys.utils'

const MAX_YEAR_DOTS = 3

const yearKeys = {
	month: (monthId: string) => `year-month-${monthId}`,
	monthTitle: (monthId: string) => `year-month-title-${monthId}`,
	monthCount: (monthId: string) => `year-month-count-${monthId}`,
	day: (monthKey: string, dayKeyStr: string) =>
		`year-day-${monthKey}-${dayKeyStr}`,
} as const

interface YearViewProps {
	context: PluginViewContext
}

export const YearView = ({ context }: YearViewProps) => {
	const current =
		parseDate(context.state.currentDate, context.timezone) ??
		now(context.timezone)
	const model = buildYearViewModel({
		currentDate: current,
		events: context.events,
		firstDayOfWeek: context.firstDayOfWeek,
		timezone: context.timezone,
		locale: context.locale,
	})

	return (
		<div data-ilamy-slot="grid-scroll" data-testid="year-view">
			<div data-ilamy-part="year-grid" data-testid="year-grid">
				{model.months.map((monthModel) => {
					const monthId = monthModel.yearMonthKey.slice(5, 7)
					return (
						<div
							data-ilamy-part="year-card"
							data-testid={yearKeys.month(monthId)}
							key={monthModel.yearMonthKey}
						>
							<div data-ilamy-part="year-card-header">
								<button
									data-ilamy-part="year-month-btn"
									data-testid={yearKeys.monthTitle(monthId)}
									onClick={() =>
										context.controller.setView(
											'month',
											toOffsetIso(monthModel.date)
										)
									}
									type="button"
								>
									{monthModel.name}
								</button>
								{monthModel.eventCount > 0 && (
									<span
										data-ilamy-part="year-count-badge"
										data-testid={yearKeys.monthCount(monthId)}
									>
										{monthModel.eventCount}{' '}
										{monthModel.eventCount === 1
											? context.t('event')
											: context.t('events')}
									</span>
								)}
							</div>

							<div data-ilamy-part="year-days-grid">
								{model.weekdayHeaders.map((wh) => (
									<div data-ilamy-part="year-weekday" key={wh.id}>
										{wh.label}
									</div>
								))}
								{monthModel.days.map((dayModel) => {
									const accessibleDate = formatDate(
										dayModel.date,
										{
											weekday: 'long',
											month: 'long',
											day: 'numeric',
											year: 'numeric',
										},
										context.locale
									)
									const countNoun =
										dayModel.eventCount === 1
											? context.t('event')
											: context.t('events')
									const countTitle =
										dayModel.eventCount > 0
											? `${dayModel.eventCount} ${countNoun}`
											: ''
									const ariaLabel = countTitle
										? `${accessibleDate}, ${countTitle}`
										: accessibleDate
									const dotCount = Math.min(dayModel.eventCount, MAX_YEAR_DOTS)
									return (
										<button
											aria-current={dayModel.isToday ? 'date' : undefined}
											aria-label={ariaLabel}
											data-date={dayModel.dayKey}
											data-ilamy-part="year-day-btn"
											data-outside-month={
												!dayModel.isInCurrentMonth ? 'true' : undefined
											}
											data-selected={dayModel.isSelected ? 'true' : undefined}
											data-testid={yearKeys.day(
												monthModel.yearMonthKey,
												dayModel.dayKey
											)}
											data-today={dayModel.isToday ? 'true' : undefined}
											key={dayModel.dayKey}
											onClick={() =>
												context.controller.setView(
													'day',
													toOffsetIso(dayModel.date)
												)
											}
											title={countTitle}
											type="button"
										>
											<span>{dayModel.date.day}</span>
											{dotCount > 0 && (
												<div data-ilamy-part="year-day-dots">
													{[1, 2, 3].slice(0, dotCount).map((dotNum) => (
														<span
															data-ilamy-part="year-day-dot"
															key={rendererKeys.key.yearDot(
																dayModel.dayKey,
																dotNum
															)}
														/>
													))}
												</div>
											)}
										</button>
									)
								})}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
