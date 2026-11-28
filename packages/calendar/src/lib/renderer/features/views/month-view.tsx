/** @jsxImportSource preact */
import {
	buildMonthViewModel,
	getFields,
	type HeadlessCalendarController,
} from '../../../../index'
import type { InteractionPreview } from '../../../interactions/calendar-pointer-engine'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RendererActions,
} from '../../types/renderer.types'
import {
	resolveAnchorDate,
	useMonthViewportSetup,
} from '../../utils/cell-slot.utils'
import { resolveDragPreviewEvent } from '../../utils/drag-preview.utils'
import type { CalendarFormatters } from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import { joinClassNames } from '../../utils/slot-props.utils'
import { MonthCell, MonthEventsOverlay } from './month-grid-cells'
import { ResourceHorizontalGrid } from './resource-horizontal-grid'
import { TimeGridView } from './time-grid-view'

const JS_WEEKDAY_SHORT = [
	'sun',
	'mon',
	'tue',
	'wed',
	'thu',
	'fri',
	'sat',
] as const

interface MonthViewProps {
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreview?: InteractionPreview | null
}

export const MonthView = ({
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreview,
}: MonthViewProps) => {
	const { viewportRef, state, isSticky, dayHeaderSlot } = useMonthViewportSetup(
		controller,
		options,
		actions.ownerState,
		'month'
	)
	const current = resolveAnchorDate(controller)
	const dragPreviewEvent = resolveDragPreviewEvent(dragPreview, visibleEvents)

	if (actions.ownerState.hasResourceAxis) {
		if (options.orientation === 'vertical') {
			return (
				<TimeGridView
					actions={actions}
					controller={controller}
					dragPreview={dragPreview}
					formatters={formatters}
					mode="month"
					options={options}
					visibleEvents={visibleEvents}
				/>
			)
		}
		return (
			<ResourceHorizontalGrid
				actions={actions}
				controller={controller}
				dragPreview={dragPreview}
				formatters={formatters}
				mode="month"
				options={options}
				visibleEvents={visibleEvents}
			/>
		)
	}

	if (!current) return null

	const showWeekNumbers = Boolean(options.weekNumbers)
	const model = buildMonthViewModel({
		currentDate: current,
		events: visibleEvents,
		firstDayOfWeek: state.firstDayOfWeek,
		locale: state.locale,
		hiddenDays: state.hiddenDays,
		weekNumbers: showWeekNumbers,
		weekNumberCalculation: options.weekNumberCalculation,
		dayMaxEvents: options.dayMaxEvents,
		businessHours: options.businessHours,
		isCellDisabled: options.isCellDisabled,
	})

	const colTemplate = `repeat(${model.colCount}, minmax(0, 1fr))`
	const firstWeekDays = model.weeks[0]?.days ?? []

	return (
		<div
			aria-label={actions.t('month')}
			data-ilamy-slot="grid-scroll"
			data-testid="dom-month-view"
			ref={viewportRef}
			role="grid"
		>
			<div
				className={joinClassNames(options.viewHeaderClassName)}
				data-ilamy-grid-lines={!options.unstyled ? 'true' : undefined}
				data-ilamy-part="month-header-grid"
				data-ilamy-slot="month-header"
				data-sticky={isSticky ? 'true' : undefined}
				data-sticky-inset={isSticky ? 'top' : undefined}
				data-testid="month-header"
				role="row"
				style={{ gridTemplateColumns: colTemplate }}
				tabIndex={-1}
			>
				{model.weekdayHeaders.map((label, idx) => {
					const headerDay = firstWeekDays[idx]?.date
					const weekdayKey = headerDay
						? JS_WEEKDAY_SHORT[getFields(headerDay).dayOfWeek]
						: label.toLowerCase().slice(0, 3)
					const formatted = headerDay
						? formatters.formatDayHeader(headerDay)
						: label
					return (
						<div
							className={joinClassNames(dayHeaderSlot.className)}
							data-ilamy-slot="day-header"
							data-testid={rendererKeys.testId.monthWeekday(weekdayKey)}
							key={rendererKeys.key.weekdayCol(label, idx)}
							role="columnheader"
							style={dayHeaderSlot.style}
							tabIndex={-1}
						>
							{formatted}
						</div>
					)
				})}
			</div>

			{model.weeks.map((week, weekIdx) => (
				<div
					data-ilamy-part="month-row"
					key={rendererKeys.key.weekRow(weekIdx)}
					role="row"
					style={{ gridTemplateColumns: colTemplate }}
					tabIndex={-1}
				>
					<div
						data-ilamy-grid-lines={!options.unstyled ? 'true' : undefined}
						data-ilamy-part="grid-row-grid"
						data-ilamy-slot="grid-row"
						role="presentation"
						style={{
							gridColumn: `1 / span ${model.colCount}`,
							gridTemplateColumns: colTemplate,
						}}
					>
						{week.days.map((dayModel, dayIdx) => (
							<MonthCell
								actions={actions}
								cellLayout={week.layout.columnLayouts.at(dayIdx)}
								cellModel={dayModel}
								controller={controller}
								isLastCol={dayIdx === week.days.length - 1}
								key={rendererKeys.key.weekRow(dayIdx)}
								options={options}
								role="gridcell"
								weekNumber={dayIdx === 0 ? week.weekNumber : undefined}
							/>
						))}
						<MonthEventsOverlay
							actions={actions}
							controller={controller}
							days={week.days.map((d) => d.date)}
							dragPreviewEvent={dragPreviewEvent}
							formatters={formatters}
							layout={week.layout}
							options={options}
							role="gridcell"
						/>
					</div>
				</div>
			))}
		</div>
	)
}
