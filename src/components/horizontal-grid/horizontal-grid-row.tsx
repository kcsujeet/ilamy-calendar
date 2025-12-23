import type React from 'react'
import { memo } from 'react'
import type dayjs from '@/lib/configs/dayjs-config'
import { DAY_NUMBER_HEIGHT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { GridCell } from '../grid-cell'
import { ResourceCell } from '../resource-cell'
import { HorizontalGridEventsLayer } from './horizontal-grid-events-layer'

export interface HorizontalGridRowProps {
	id: string | number
	title?: string
	resource?: any
	days: dayjs.Dayjs[]
	gridType?: 'day' | 'hour'
	dayMaxEvents?: number
	className?: string
	renderResource?: (resource: any) => React.ReactNode
	renderCell?: (day: dayjs.Dayjs, index: number) => React.ReactNode
	'data-testid'?: string
	rowTestId?: string
	hideLabel?: boolean
	dayNumberHeight?: number
	allDay?: boolean
	showDayNumber?: boolean
}

const NoMemoHorizontalGridRow: React.FC<HorizontalGridRowProps> = ({
	id,
	title,
	resource,
	days,
	gridType = 'day',
	dayMaxEvents,
	className,
	renderResource,
	renderCell,
	'data-testid': dataTestId,
	rowTestId,
	hideLabel = false,
	dayNumberHeight = DAY_NUMBER_HEIGHT,
	allDay,
	showDayNumber = false,
}) => {
	return (
		<div
			className={cn('flex flex-1 relative min-h-[60px]', className)}
			data-testid={dataTestId || rowTestId || `horizontal-row-${id}`}
		>
			{/* Label column (e.g., Resource name or Date) */}
			{!hideLabel && (
				<div className="w-40 sticky left-0 z-20 shrink-0 border-r bg-background flex items-center">
					{resource ? (
						<ResourceCell
							className="h-full w-full"
							data-testid={`horizontal-row-label-${id}`}
							resource={resource}
						>
							{renderResource ? renderResource(resource) : null}
						</ResourceCell>
					) : (
						<div
							className="p-2 wrap-break-word text-sm font-medium"
							data-testid={`horizontal-row-label-${id}`}
						>
							{title || id}
						</div>
					)}
				</div>
			)}

			<div className="relative flex-1 flex">
				{days.map((day, index) => {
					if (renderCell) {
						return (
							<div className="relative flex-1" key={day.toISOString()}>
								{renderCell(day, index)}
							</div>
						)
					}

					return (
						<GridCell
							allDay={allDay}
							className="border-r border-b flex-1"
							day={day}
							dayMaxEvents={dayMaxEvents}
							gridType={gridType}
							index={day.day()}
							key={day.toISOString()}
							resourceId={resource ? id : undefined}
							showDayNumber={showDayNumber}
						/>
					)
				})}

				{/* Events layer positioned absolutely over the row */}
				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
						allDay={allDay}
						data-testid={`horizontal-events-${id}`}
						dayNumberHeight={dayNumberHeight}
						days={days}
						gridType={gridType}
						resourceId={resource ? id : undefined}
					/>
				</div>
			</div>
		</div>
	)
}

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow)
