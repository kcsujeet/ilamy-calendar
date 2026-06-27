import type { VerticalColumnSpec } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { memo } from 'react'
import { keys } from '@/lib/utils/keys'
import { GridCell } from '../grid-cell'
import { VerticalGridEventsLayer } from './vertical-grid-events-layer'

export interface VerticalGridColProps extends VerticalColumnSpec {
	'data-testid'?: string
	/**
	 * Granularity of each hour row in minutes. `60` renders one cell per hour with
	 * no sub-hour lines. `30` renders two. `15` renders four with dashed separators.
	 */
	slotDurationMinutes?: number
	/** Whether this is the last column in the grid */
	isLastColumn?: boolean
}

const NoMemoVerticalGridCol: React.FC<VerticalGridColProps> = ({
	id,
	days,
	resource,
	'data-testid': dataTestId,
	gridType,
	className,
	renderCell,
	noEvents,
	slotDurationMinutes = 60,
	isLastColumn,
}) => {
	// The spec carries `resource` as the single source; derive the id here.
	const resourceId = resource?.id
	const slotCount = Math.floor(60 / slotDurationMinutes)
	const cellOffsets = Array.from(
		{ length: slotCount },
		(_, i) => i * slotDurationMinutes
	)
	const hasSubHourSlots = cellOffsets.length > 1
	return (
		<div
			className={cn(
				// Separator is on the cells, not this opaque column (it overpaints faint).
				'flex flex-col flex-1 items-center min-w-20 justify-center bg-background relative border-r-0',
				className
			)}
			data-testid={dataTestId || keys.container.vertical.col(id)}
		>
			{/* Time slots */}
			<div
				className="w-full h-full relative grid"
				style={{
					gridTemplateRows: `repeat(${days.length}, minmax(0, 1fr))`,
				}}
			>
				{days.map((day, dayIndex) => {
					const hourStr = day.format('HH')
					// Last hour drops border-b to avoid doubling the calendar's bottom.
					const isLastHour = dayIndex === days.length - 1

					if (renderCell) {
						const isTimeGutter = id === keys.col.time
						const testId = isTimeGutter
							? keys.cell.verticalTime(hourStr)
							: keys.cell.vertical(day, hourStr, '00', resourceId)
						return (
							<div
								className={cn(
									'min-h-[60px] border-r border-b',
									isLastHour && 'border-b-0'
								)}
								data-hour={isTimeGutter ? hourStr : undefined}
								data-testid={testId}
								key={keys.listKey(id, dayIndex, hourStr)}
							>
								{renderCell(day)}
							</div>
						)
					}

					return (
						<div
							className="flex flex-col min-h-[60px]"
							key={keys.listKey(id, dayIndex, hourStr)}
						>
							{cellOffsets.map((minute, offsetIndex) => {
								const mm = String(minute).padStart(2, '0')
								const testId = keys.cell.vertical(day, hourStr, mm, resourceId)
								const isBottomCell =
									isLastHour && offsetIndex === cellOffsets.length - 1

								return (
									<GridCell
										className={cn(
											'hover:bg-accent relative z-10 flex-1 min-h-0 cursor-pointer border-b',
											isLastColumn ? 'border-r-0' : 'border-r',
											isBottomCell && 'border-b-0',
											hasSubHourSlots && 'border-dashed'
										)}
										data-testid={testId}
										day={hasSubHourSlots ? day.minute(minute) : day}
										gridType={gridType}
										// Match the horizontal grid: a daily cell describes the
										// whole day (hour undefined); an hourly cell its slot.
										// Passing the hour for daily cells made them 00:00-01:00
										// slots, breaking drag-to-create's cross-day selection.
										hour={gridType === 'hour' ? day.hour() : undefined}
										key={keys.listKey(id, dayIndex, mm)}
										minute={hasSubHourSlots ? minute : undefined}
										resourceId={resourceId} // Events are rendered in a separate layer
										shouldRenderEvents={false}
									/>
								)
							})}
						</div>
					)
				})}

				{/* Event blocks layer */}
				{!noEvents && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<VerticalGridEventsLayer
							data-testid={keys.container.eventsLayer('vertical', id)}
							days={days}
							gridType={gridType}
							resource={resource}
							resourceId={resourceId}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export const VerticalGridCol = memo(
	NoMemoVerticalGridCol
) as typeof NoMemoVerticalGridCol
