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
				// Opaque column; grid lines come from the gaps in the containers
				// (this one for vertical separators between columns is the parent's job).
				'flex flex-col flex-1 items-center min-w-20 justify-center bg-background relative',
				className
			)}
			data-testid={dataTestId || keys.container.vertical.col(id)}
		>
			{/* Time slots. gap-px + bg-border draws the hour lines through the gaps. */}
			<div
				className="w-full h-full relative grid gap-px bg-border"
				style={{
					gridTemplateRows: `repeat(${days.length}, minmax(0, 1fr))`,
				}}
			>
				{days.map((day, dayIndex) => {
					const hourStr = day.format('HH')

					if (renderCell) {
						const isTimeGutter = id === keys.col.time
						const testId = isTimeGutter
							? keys.cell.verticalTime(hourStr)
							: keys.cell.vertical(day, hourStr, '00', resourceId)
						return (
							<div
								className="min-h-[60px] bg-background"
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
								// Sub-hour slots keep a dashed divider (the documented gap
								// exception) between sub-slots within an hour; the solid hour
								// lines come from the grid's gap-px.
								const isSubDivider =
									hasSubHourSlots && offsetIndex < cellOffsets.length - 1

								return (
									<GridCell
										className={cn(
											'hover:bg-accent relative z-10 flex-1 min-h-0 cursor-pointer',
											isSubDivider && 'border-b border-dashed'
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
