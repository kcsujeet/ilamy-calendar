import type React from 'react'
import { memo } from 'react'
import type { Resource } from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { GridCell } from '../grid-cell'
import { VerticalGridEventsLayer } from './vertical-grid-events-layer'

export interface VerticalGridColProps {
	id: string
	day: dayjs.Dayjs
	resourceId?: string | number
	resource?: Resource
	days: dayjs.Dayjs[] // The specific day this column represents
	className?: string
	'data-testid'?: string
	gridType?: 'day' | 'hour'
	renderHeader?: () => React.ReactNode
	renderCell?: (date: dayjs.Dayjs) => React.ReactNode
	noEvents?: boolean
	/** Optional array of minute slots by which the hour is divided
	 * e.g., [0, 15, 30, 45] for quarter-hour slots
	 */
	cellSlots?: number[]
	/** Whether this is the last column in the grid */
	isLastColumn?: boolean
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
}) => {
	return (
		<div
			className={cn(
				'flex flex-col flex-1 items-center justify-center min-w-50 bg-background relative',
				className
			)}
			data-testid={dataTestId || `vertical-col-${id}`}
		>
			{/* Time slots */}
			<div
				className="w-full relative grid"
				style={{
					gridTemplateRows: `repeat(${days.length}, minmax(0, 1fr))`,
				}}
			>
				{days.map((day) => {
					const hourStr = day.format('HH')
					const dateStr = day.format('YYYY-MM-DD')

					if (renderCell) {
						const testId =
							id === 'time-col'
								? `vertical-time-${hourStr}`
								: `vertical-cell-${dateStr}-${hourStr}-00${resourceId ? `-${resourceId}` : ''}`
						return (
							<div
								className="h-[60px] border-b border-r"
								data-testid={testId}
								key={`${dateStr}-${hourStr}`}
							>
								{renderCell(day)}
							</div>
						)
					}

					return cellSlots.map((minute) => {
						const m = minute === 60 ? undefined : minute
						const mm = m === undefined ? '00' : String(m).padStart(2, '0')
						const testId = `vertical-cell-${dateStr}-${hourStr}-${mm}${resourceId ? `-${resourceId}` : ''}`

						return (
							<GridCell
								className={cn(
									'hover:bg-accent relative z-10 h-[60px] cursor-pointer border-b',
									minute === 60 ? '' : 'border-dashed h-[15px] min-h-[15px]',
									isLastColumn ? 'border-r-0' : 'border-r'
								)}
								data-testid={testId}
								day={m ? day.minute(m) : day}
								gridType={gridType}
								hour={day.hour()}
								key={`${dateStr}-${hourStr}-${mm}-${resourceId || 'no-resource'}`}
								minute={m}
								resourceId={resourceId} // Events are rendered in a separate layer
								shouldRenderEvents={false}
							/>
						)
					})
				})}

				{/* Event blocks layer */}
				{!noEvents && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<VerticalGridEventsLayer
							data-testid={`vertical-events-${id}`}
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
