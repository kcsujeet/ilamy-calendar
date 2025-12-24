import type React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import {
	HorizontalGridRow,
	type HorizontalGridRowProps,
} from './horizontal-grid-row'

interface HorizontalGridProps {
	rows: HorizontalGridRowProps[]
	children?: React.ReactNode
	classes?: { header?: string; body?: string; scroll?: string }
	allDay?: boolean
	gridType?: 'day' | 'hour'
	variant?: 'regular' | 'resource'
	dayNumberHeight?: number
}

export const HorizontalGrid: React.FC<HorizontalGridProps> = ({
	rows,
	children,
	classes,
	allDay: topLevelAllDay,
	gridType,
	variant = 'resource',
	dayNumberHeight,
}) => {
	const { stickyViewHeader, viewHeaderClassName, currentDate } =
		useSmartCalendarContext((state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
			currentDate: state.currentDate,
		}))

	return (
		<ScrollArea
			className={cn('h-full border', classes?.scroll)}
			data-testid="horizontal-grid-scroll"
			viewPortProps={{ className: '*:flex! *:flex-col! *:min-h-full' }}
		>
			{/* header row */}
			{children && (
				<div
					className={cn(
						'flex h-12 w-fit',
						stickyViewHeader && 'sticky top-0 z-21 bg-background',
						classes?.header,
						viewHeaderClassName
					)}
					data-testid="horizontal-grid-header"
				>
					{children}
				</div>
			)}

			{/* Calendar area with scroll */}
			<div
				className={cn('flex flex-1 h-[calc(100%-3rem)] w-fit', classes?.body)}
				data-testid="horizontal-grid-body"
			>
				<div
					className="relative w-full flex flex-col flex-1"
					key={currentDate.format('YYYY-MM')}
				>
					{rows.map((row, index) => (
						<HorizontalGridRow
							allDay={row.allDay ?? topLevelAllDay}
							dayNumberHeight={dayNumberHeight}
							gridType={gridType}
							isLastRow={index === rows.length - 1}
							key={row.id}
							variant={variant}
							{...row}
						/>
					))}
				</div>
			</div>

			<ScrollBar className="z-30" />
			<ScrollBar className="z-30" orientation="horizontal" />
		</ScrollArea>
	)
}
