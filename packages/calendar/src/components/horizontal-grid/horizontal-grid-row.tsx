import type {
	HorizontalCellSpec,
	HorizontalRowSpec,
	Resource,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { memo, useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/useProcessedWeekEvents'
import { getDayKey } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { GridCell } from '../grid-cell'
import { ResourceCell } from '../resource-cell'
import { HorizontalGridEventsLayer } from './horizontal-grid-events-layer'

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
}) => {
	const { renderResource } = useSmartCalendarContext()

	const isResourceCalendar = variant === 'resource'
	// Flat columns: each column has col.day (regular month, resource month)
	// Grouped columns: each column has col.days[] (resource week horizontal)
	const isGrouped = columns.some((col) => col.days)

	// Collect all days for flat rows
	const flatDays = useMemo(() => {
		if (isGrouped) return []
		return columns.map((col) => col.day).filter((d): d is Dayjs => Boolean(d))
	}, [columns, isGrouped])

	// Compute events once at the row level — shared between GridCells and events layer
	const { positionedEvents, dayEventsMap } = useProcessedWeekEvents({
		days: flatDays,
		gridType,
		resourceId: resource?.id,
		allDay,
	})

	return (
		<div
			className={cn('flex flex-1 relative min-w-0', className)}
			data-testid={keys.container.horizontal.row(id)}
		>
			{isResourceCalendar && resource && (
				<ResourceCell
					className="w-20 sm:w-40 border-r sticky left-0 bg-background z-20 h-full"
					data-testid={keys.container.horizontal.rowLabel(resource.id)}
					resource={resource}
				>
					{renderResource ? (
						renderResource(resource)
					) : (
						<div className="wrap-break-word text-sm">{resource.title}</div>
					)}
				</ResourceCell>
			)}
			<div className="relative flex-1 flex min-w-0">
				{/* gap-px + bg-border draws the vertical separators between cells. */}
				<div className="flex w-full min-w-0 gap-px bg-border">
					{columns.map((col) => {
						if (col.days) {
							return (
								<GroupedColumn
									allDay={allDay}
									col={col}
									dayNumberHeight={dayNumberHeight}
									gridType={gridType}
									id={id}
									key={col.id}
									resource={resource}
									resourceId={resource?.id}
									showDayNumber={showDayNumber}
								/>
							)
						}

						return col.day ? (
							<GridCell
								allDay={allDay}
								className={cn('flex-1 w-20', col.className)}
								day={col.day}
								gridType={gridType}
								hour={gridType === 'hour' ? col.day.hour() : undefined}
								key={col.day.toISOString()}
								precomputedEvents={dayEventsMap.get(getDayKey(col.day))}
								resourceId={resource?.id}
								showDayNumber={showDayNumber}
							/>
						) : null
					})}
				</div>

				{/* Events layer positioned absolutely over the row */}
				{!isGrouped && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<HorizontalGridEventsLayer
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

/**
 * A column containing multiple days (e.g., one day's hourly slots in resource week view).
 * Needs its own useProcessedWeekEvents call since events are scoped to this day group.
 */
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
	}: {
		col: HorizontalGridColumn
		gridType?: 'day' | 'hour'
		allDay?: boolean
		resource?: Resource
		resourceId?: string | number
		dayNumberHeight?: number
		showDayNumber: boolean
		id: string | number
	}) => {
		const days = col.days ?? []
		const { positionedEvents } = useProcessedWeekEvents({
			days,
			gridType,
			resourceId,
			allDay,
		})

		return (
			<div className="flex relative w-full">
				{/* gap-px + bg-border draws the day separators within the group. */}
				<div className="flex w-full gap-px bg-border">
					{days.map((day) => (
						<GridCell
							allDay={allDay}
							className={cn('flex-1 w-20', col.className)}
							day={day}
							gridType={gridType}
							hour={gridType === 'hour' ? day.hour() : undefined}
							key={day.toISOString()}
							resourceId={resourceId}
							showDayNumber={showDayNumber}
						/>
					))}
				</div>

				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
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
