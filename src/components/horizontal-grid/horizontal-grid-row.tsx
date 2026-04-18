import type React from 'react'
import { memo, useMemo } from 'react'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/useProcessedWeekEvents'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { GridCell } from '../grid-cell'
import { ResourceCell } from '../resource-cell'
import { HorizontalGridEventsLayer } from './horizontal-grid-events-layer'

interface HorizontalGridColumn {
	id: string
	day?: Dayjs
	days?: Dayjs[]
	gridType: 'day' | 'hour'
	className?: string
	renderCell?: (row: HorizontalGridRowProps) => React.ReactNode
}

export interface HorizontalGridRowProps {
	id: string | number
	resource?: Resource
	gridType?: 'day' | 'hour'
	variant?: 'regular' | 'resource'
	dayNumberHeight?: number
	className?: string
	columns?: HorizontalGridColumn[]
	allDay?: boolean
	showDayNumber?: boolean
	isLastRow?: boolean
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
	isLastRow = false,
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
		dayNumberHeight,
		allDay,
	})

	return (
		<div
			className={cn('flex flex-1 relative', className)}
			data-testid={`horizontal-row-${id}`}
		>
			{isResourceCalendar && resource && (
				<ResourceCell
					className="w-20 sm:w-40 sticky left-0 bg-background z-20 h-full"
					data-testid={`horizontal-row-label-${resource.id}`}
					resource={resource}
				>
					{renderResource ? (
						renderResource(resource)
					) : (
						<div className="wrap-break-word text-sm">{resource.title}</div>
					)}
				</ResourceCell>
			)}
			<div className="relative flex-1 flex">
				<div className="flex w-full">
					{columns.map((col, index) => {
						if (col.days) {
							return (
								<GroupedColumn
									allDay={allDay}
									col={col}
									dayNumberHeight={dayNumberHeight}
									gridType={gridType}
									id={id}
									isLastCol={index === columns.length - 1}
									isLastRow={isLastRow}
									key={col.id}
									resourceId={resource?.id}
									showDayNumber={showDayNumber}
								/>
							)
						}

						return col.day ? (
							<GridCell
								allDay={allDay}
								className={cn(
									'flex-1 w-20',
									isLastRow && 'border-b-0',
									col.className
								)}
								day={col.day}
								gridType={gridType}
								hour={gridType === 'hour' ? col.day.hour() : undefined}
								key={col.day.toISOString()}
								precomputedEvents={dayEventsMap.get(
									col.day.format('YYYY-MM-DD')
								)}
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
							data-testid={`horizontal-events-${id}`}
							days={flatDays}
							positionedEvents={positionedEvents}
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
		resourceId,
		dayNumberHeight,
		showDayNumber,
		isLastRow,
		isLastCol,
		id,
	}: {
		col: HorizontalGridColumn
		gridType?: 'day' | 'hour'
		allDay?: boolean
		resourceId?: string | number
		dayNumberHeight?: number
		showDayNumber: boolean
		isLastRow: boolean
		isLastCol: boolean
		id: string | number
	}) => {
		const days = col.days ?? []
		const { positionedEvents } = useProcessedWeekEvents({
			days,
			gridType,
			resourceId,
			dayNumberHeight,
			allDay,
		})

		return (
			<div className="flex relative w-full">
				<div className="flex w-full">
					{days.map((day) => (
						<GridCell
							allDay={allDay}
							className={cn(
								'flex-1 w-20',
								isLastRow && 'border-b-0',
								!isLastCol && 'border-r!',
								col.className
							)}
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
						data-testid={`horizontal-events-${id}`}
						days={days}
						positionedEvents={positionedEvents}
						resourceId={resourceId}
					/>
				</div>
			</div>
		)
	}
)

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow)
