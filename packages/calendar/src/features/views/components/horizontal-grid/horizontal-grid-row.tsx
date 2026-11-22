import type {
	HorizontalCellSpec,
	HorizontalRowSpec,
	Resource,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	getWeekNumber,
	parseDate,
	resolveZone,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { memo, useMemo } from 'react'
import { GridCell } from '@/features/views/components/grid-cell/grid-cell'
import { HorizontalGridEventsLayer } from '@/features/views/components/horizontal-grid/events-layer/horizontal-grid-events-layer'
import { ResourceCell } from '@/features/views/components/resource-cell'
import { useProcessedWeekEvents } from '@/features/views/hooks/use-processed-week-events'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { styledClass, useCalendarTheme } from '@/stores/calendar-theme-context'
import { keys } from '@/utils/keys.utils'

interface HorizontalGridColumn extends HorizontalCellSpec {
	renderCell?: (row: HorizontalGridRowProps) => React.ReactNode
}

export interface HorizontalGridRowProps extends HorizontalRowSpec {
	gridType?: 'day' | 'hour'
	variant?: 'regular' | 'resource'
	dayNumberHeight?: number
	columns?: HorizontalGridColumn[]
	allDay?: boolean
}

/** The sticky resource cell at the start of a resource row. */
const RowLabel: React.FC<{ resource: Resource }> = ({ resource }) => {
	const { renderResource } = useSmartCalendarContext((c) => ({
		renderResource: c.renderResource,
	}))
	let labelContent: React.ReactNode
	if (renderResource) {
		labelContent = renderResource(resource)
	} else {
		labelContent = (
			<div className="wrap-break-word text-sm">{resource.title}</div>
		)
	}
	return (
		<ResourceCell
			className="w-20 sm:w-40 border-r sticky left-0 bg-background z-20 h-full"
			data-sticky-inset="left"
			data-testid={keys.container.horizontal.rowLabel(resource.id)}
			resource={resource}
		>
			{labelContent}
		</ResourceCell>
	)
}

const NoMemoHorizontalGridRow: React.FC<HorizontalGridRowProps> = ({
	id,
	resource,
	gridType = 'day',
	variant = 'resource',
	dayNumberHeight,
	className,
	columns = [],
	allDay,
	showDayNumber = false,
	showWeekNumber = false,
}) => {
	const { weekNumbers, weekNumberCalculation, timezone, currentLocale } =
		useSmartCalendarContext((c) => ({
			weekNumbers: c.weekNumbers,
			weekNumberCalculation: c.weekNumberCalculation,
			timezone: c.timezone,
			currentLocale: c.currentLocale,
		}))
	const { unstyled } = useCalendarTheme()
	const zone = resolveZone(timezone)

	const isResourceCalendar = variant === 'resource'
	const isGrouped = columns.some((col) => col.days)

	const parsedColumns = useMemo(
		() =>
			columns.map((col) => ({
				col,
				zonedDay: col.day ? parseDate(col.day, zone) : undefined,
			})),
		[columns, zone]
	)

	const flatDays = useMemo(() => {
		if (isGrouped) return []
		return parsedColumns
			.map((entry) => entry.zonedDay)
			.filter((d): d is ZonedDate => Boolean(d))
	}, [parsedColumns, isGrouped])

	const { positionedEvents, columnLayouts } = useProcessedWeekEvents({
		days: flatDays,
		gridType,
		resourceId: resource?.id,
		allDay,
	})

	const firstDay = flatDays.at(0)
	const isWeekNumberOn = weekNumbers === true
	let weekNumber: number | undefined
	if (showWeekNumber && isWeekNumberOn && firstDay) {
		weekNumber = getWeekNumber(firstDay, weekNumberCalculation, currentLocale)
	}

	return (
		<div
			className={cn('flex flex-1 relative min-w-0', className)}
			data-testid={keys.container.horizontal.row(id)}
		>
			{isResourceCalendar && resource && <RowLabel resource={resource} />}
			<div className="relative flex-1 flex min-w-0">
				{/* gap-px + bg-border draws the vertical separators between cells. */}
				<div
					className={cn(
						'flex w-full min-w-0',
						styledClass(unstyled, 'gap-px bg-border')
					)}
				>
					{parsedColumns.map(({ col, zonedDay }, columnIndex) => {
						const columnKey = keys.listKey('col', columnIndex)
						if (col.days) {
							return (
								<GroupedColumn
									allDay={allDay}
									col={col}
									dayNumberHeight={dayNumberHeight}
									gridType={gridType}
									id={id}
									key={columnKey}
									resource={resource}
									resourceId={resource?.id}
									showDayNumber={showDayNumber}
									timezone={zone}
								/>
							)
						}

						if (!zonedDay) return null
						const cellLayout = columnLayouts.get(zonedDay)
						return (
							<GridCell
								allDay={allDay}
								axis="horizontal"
								className={cn('flex-1 w-20', col.className)}
								day={zonedDay}
								gridType={gridType}
								hour={gridType === 'hour' ? zonedDay.hour : undefined}
								key={columnKey}
								precomputedLayout={cellLayout}
								resourceId={resource?.id}
								showDayNumber={showDayNumber}
								weekNumber={columnIndex === 0 ? weekNumber : undefined}
							/>
						)
					})}
				</div>

				{!isGrouped && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<HorizontalGridEventsLayer
							allDay={allDay}
							data-testid={keys.container.eventsLayer('horizontal', id)}
							dayNumberHeight={dayNumberHeight}
							days={flatDays}
							gridType={gridType}
							positionedEvents={positionedEvents}
							resource={resource}
							resourceId={resource?.id}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

const GroupedColumn = memo(
	({
		col,
		gridType = 'day',
		allDay,
		resource,
		resourceId,
		dayNumberHeight,
		showDayNumber,
		id,
		timezone,
	}: {
		col: HorizontalGridColumn
		gridType?: 'day' | 'hour'
		allDay?: boolean
		resource?: Resource
		resourceId?: string | number
		dayNumberHeight?: number
		showDayNumber: boolean
		id: string | number
		timezone: string
	}) => {
		const days = useMemo(
			() =>
				(col.days ?? [])
					.map((dayIso) => parseDate(dayIso, timezone))
					.filter((d): d is ZonedDate => Boolean(d)),
			[col.days, timezone]
		)
		const { unstyled } = useCalendarTheme()
		const { positionedEvents, columnLayouts } = useProcessedWeekEvents({
			days,
			gridType,
			resourceId,
			allDay,
		})

		return (
			<div className="flex relative w-full">
				<div className={cn('flex w-full', !unstyled && 'gap-px bg-border')}>
					{days.map((day, dayIndex) => {
						const cellLayout = columnLayouts.get(day)
						return (
							<GridCell
								allDay={allDay}
								axis="horizontal"
								className={cn('flex-1 w-20', col.className)}
								day={day}
								gridType={gridType}
								hour={gridType === 'hour' ? day.hour : undefined}
								key={keys.listKey('day', dayIndex)}
								precomputedLayout={cellLayout}
								resourceId={resourceId}
								showDayNumber={showDayNumber}
							/>
						)
					})}
				</div>

				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
						allDay={allDay}
						data-testid={keys.container.eventsLayer('horizontal', id)}
						dayNumberHeight={dayNumberHeight}
						days={days}
						gridType={gridType}
						positionedEvents={positionedEvents}
						resource={resource}
						resourceId={resourceId}
					/>
				</div>
			</div>
		)
	}
)

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow)
