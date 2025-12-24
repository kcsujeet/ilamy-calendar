import type React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { ids } from '@/lib/utils/ids'
import { VerticalGridCol, type VerticalGridColProps } from './vertical-grid-col'

interface VerticalGridProps {
	columns: VerticalGridColProps[]
	children?: React.ReactNode
	gridType?: 'day' | 'hour'
	classes?: { header?: string; body?: string; allDay?: string }
	allDayRow?: React.ReactNode
	/**
	 * Optional array of minute slots by which the hour is divided
	 * e.g., [0, 15, 30, 45] for quarter-hour slots
	 */
	cellSlots?: number[]
}

export const VerticalGrid: React.FC<VerticalGridProps> = ({
	columns,
	children,
	gridType = 'day',
	classes,
	allDayRow,
	cellSlots,
}) => {
	const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
		(state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
		})
	)

	return (
		<ScrollArea
			className="h-full border"
			data-testid={ids.verticalGrid.scroll}
			viewPortProps={{ className: '*:flex! *:flex-col! *:min-h-full' }}
		>
			{/* header row */}
			<div
				className={cn(
					stickyViewHeader && 'sticky top-0 z-21 bg-background' // Z-index above the left sticky resource column
				)}
			>
				<div
					className={cn(
						'flex justify-center items-center h-12 border-b w-fit',
						classes?.header,
						viewHeaderClassName
					)}
					data-testid={ids.verticalGrid.header}
				>
					{children}
				</div>
				{/* All-day row */}
				{allDayRow && (
					<div
						className={cn(
							'flex w-full border-b min-h-12 h-full',
							classes?.allDay
						)}
						data-testid={ids.verticalGrid.allDay}
					>
						{allDayRow}
					</div>
				)}
			</div>
			{/* Calendar area with scroll */}
			<div
				className={cn('flex flex-1 h-[calc(100%-3rem)] w-fit', classes?.body)}
				data-testid={ids.verticalGrid.body}
			>
				{/* Day columns with time slots */}
				{columns.map((column, index) => (
					<VerticalGridCol
						key={`${column.id}-${index}`}
						{...column}
						cellSlots={cellSlots}
						gridType={gridType}
						isLastColumn={index === columns.length - 1}
					/>
				))}
			</div>
			<ScrollBar className="z-30" /> {/* vertical scrollbar */}
			<ScrollBar className="z-30" orientation="horizontal" />{' '}
			{/* horizontal scrollbar */}
		</ScrollArea>
	)
}
