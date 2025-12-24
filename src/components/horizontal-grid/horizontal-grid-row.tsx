import type React from 'react'
import { memo } from 'react'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { GridCell } from '../grid-cell'
import { ResourceCell } from '../resource-cell'
import { HorizontalGridEventsLayer } from './horizontal-grid-events-layer'

interface HorizontalGridColumn {
	id: string
	day: dayjs.Dayjs
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
	const { renderResource } = useSmartCalendarContext((state) => ({
		renderResource: state.renderResource,
	}))

	const isResourceCalendar = variant === 'resource'

	return (
		<div
			className={cn('flex flex-1 relative min-h-[60px]', className)}
			data-testid={`horizontal-row-${id}`}
		>
			{isResourceCalendar && (
				<ResourceCell
					className="w-40 min-w-40 max-w-40 sticky left-0 bg-background z-20 h-full"
					data-testid={`horizontal-row-label-${resource?.id}`}
					resource={resource}
				>
					{renderResource ? (
						renderResource(resource)
					) : (
						<div className="wrap-break-word text-sm">{resource?.title}</div>
					)}
				</ResourceCell>
			)}
			<div className="relative flex-1 flex">
				<div className="flex w-full">
					{columns.map((col) => {
						return (
							<GridCell
								allDay={allDay}
								className={cn(
									'flex-1 w-20',
									isLastRow && 'border-b-0',
									col.className
								)}
								day={col.day}
								gridType={gridType}
								key={col.day.toISOString()}
								resourceId={resource?.id}
								showDayNumber={showDayNumber}
							/>
						)
					})}
				</div>

				{/* Events layer positioned absolutely over the row */}
				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
						allDay={allDay}
						data-testid={`horizontal-events-${id}`}
						dayNumberHeight={dayNumberHeight}
						days={columns.map((col) => col.day).filter(Boolean)}
						gridType={gridType}
						resourceId={resource?.id}
					/>
				</div>
			</div>
		</div>
	)
}

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow)
