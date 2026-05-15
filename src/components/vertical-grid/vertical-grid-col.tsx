import type React from 'react'
import { memo } from 'react'
import type { Resource } from '@/features/resource-calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { HOUR_ROW_HEIGHT_PX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'
import { GridCell } from '../grid-cell'
import { VerticalGridEventsLayer } from './vertical-grid-events-layer'

export interface VerticalGridColProps {
	id: string
	day?: Dayjs
	resourceId?: string | number
	resource?: Resource
	days: Dayjs[] // The specific day this column represents
	className?: string
	'data-testid'?: string
	gridType?: 'day' | 'hour'
	renderHeader?: () => React.ReactNode
	renderCell?: (date: Dayjs) => React.ReactNode
	noEvents?: boolean
	/** Optional array of minute slots by which the hour is divided
	 * e.g., [0, 15, 30, 45] for quarter-hour slots
	 */
	cellSlots?: number[]
	/** Whether this is the last column in the grid */
	isLastColumn?: boolean
	/**
	 * When the parent `vertical-grid-body` uses CSS Grid tracks, omit `flex-1`/`min-w-20` so width
	 * comes only from the grid template (week view).
	 */
	gridCell?: boolean
}

const NoMemoVerticalGridCol: React.FC<VerticalGridColProps> = ({
	id,
	days,
	resourceId,
	resource,
	'data-testid': dataTestId,
	gridType,
	className,
	renderCell,
	noEvents,
	cellSlots = [60], // Default to full hour slots
	isLastColumn,
	gridCell = false,
}) => {
	const isHourGrid = gridType === 'hour'

	return (
		<div
			className={cn(
				gridCell
					? cn(
							'relative box-border flex w-full max-w-full flex-col overflow-x-clip bg-background',
							isHourGrid ? 'h-auto' : 'h-full min-h-0'
						)
					: 'relative box-border flex min-h-0 max-w-full min-w-20 flex-1 flex-col items-stretch justify-start overflow-x-clip bg-background',
				className
			)}
			data-testid={dataTestId || keys.container.vertical.col(id)}
		>
			{/* Time slots */}
			<div
				className={cn(
					'relative grid w-full max-w-full min-w-0 overflow-x-clip',
					isHourGrid ? 'h-auto' : 'h-full min-h-0'
				)}
				style={{
					gridTemplateRows: isHourGrid
						? `repeat(${days.length}, ${HOUR_ROW_HEIGHT_PX}px)`
						: `repeat(${days.length}, minmax(0, 1fr))`,
				}}
			>
				{days.map((day, dayIndex) => {
					const hourStr = day.format('HH')

					if (renderCell) {
						const testId =
							id === keys.col.time
								? keys.cell.verticalTime(hourStr)
								: keys.cell.vertical(day, hourStr, '00', resourceId)
						return (
							<div
								className={cn(
									'min-h-[60px] min-w-0 max-w-full w-full border-b box-border',
									isLastColumn ? 'border-r-0' : 'border-r'
								)}
								data-testid={testId}
								key={keys.listKey(id, dayIndex, hourStr)}
							>
								{renderCell(day)}
							</div>
						)
					}

					return (
						<div
							className={cn(
								'flex min-h-[60px] min-w-0 max-w-full w-full flex-col overflow-x-clip',
								isLastColumn ? 'border-r-0' : 'border-r'
							)}
							key={keys.listKey(id, dayIndex, hourStr)}
						>
							{cellSlots.map((minute) => {
								const m = minute === 60 ? undefined : minute
								const mm = m === undefined ? '00' : String(m).padStart(2, '0')
								const testId = keys.cell.vertical(day, hourStr, mm, resourceId)
								const isQuarter = minute !== 60

								return (
									<GridCell
										className={cn(
											'hover:bg-accent relative z-10 flex-1 min-h-0 cursor-pointer border-b border-r-0',
											isQuarter && 'border-dashed'
										)}
										data-testid={testId}
										day={m ? day.minute(m) : day}
										gridType={gridType}
										hour={day.hour()}
										key={keys.listKey(id, dayIndex, mm)}
										minute={m}
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
