import type React from 'react'
import { memo } from 'react'
import type { Resource } from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { ids } from '@/lib/utils/ids'
import { GridCell } from '../grid-cell'
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
	className,
	columns = [],
	allDay,
	showDayNumber = false,
	isLastRow = false,
}) => {
	return (
		<div
			className={cn('flex flex-1 relative min-h-[60px]', className)}
			data-testid={ids.resourceRow(id)}
		>
			<div className="relative flex-1 flex">
				<div className="flex w-full">
					{columns.map((col) => {
						if (col.renderCell) {
							return (
								<div className={col.className} key={col.id}>
									{col.renderCell({ resource } as HorizontalGridRowProps)}
								</div>
							)
						}

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
								index={col.day.day()}
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
						days={columns.map((c) => c.day)}
						gridType={gridType}
						resourceId={id}
					/>
				</div>{' '}
			</div>
		</div>
	)
}

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow)
