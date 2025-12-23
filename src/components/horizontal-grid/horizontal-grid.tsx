import type React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import {
	HorizontalGridRow,
	type HorizontalGridRowProps,
} from './horizontal-grid-row'

interface HorizontalGridProps {
	/** Default days for all rows if row doesn't provide its own */
	days?: HorizontalGridRowProps['days']
	rows: (Omit<
		HorizontalGridRowProps,
		'days' | 'gridType' | 'dayMaxEvents' | 'allDay' | 'showDayNumber'
	> & {
		days?: HorizontalGridRowProps['days']
		allDay?: boolean
		showDayNumber?: boolean
	})[]
	gridType?: HorizontalGridRowProps['gridType']
	children?: React.ReactNode
	classes?: { header?: string; body?: string; scroll?: string }
	bodyTestId?: string
	allDay?: boolean
	showDayNumber?: boolean
}

export const HorizontalGrid: React.FC<HorizontalGridProps> = ({
	rows,
	days: topLevelDays,
	gridType = 'day',
	children,
	classes,
	bodyTestId = 'horizontal-grid-body',
	allDay: topLevelAllDay,
	showDayNumber: topLevelShowDayNumber,
}) => {
	const { stickyViewHeader, viewHeaderClassName, dayMaxEvents, currentDate } =
		useSmartCalendarContext((state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
			dayMaxEvents: state.dayMaxEvents,
			currentDate: state.currentDate,
		}))

	return (
		<ScrollArea
			className={cn('h-full', classes?.scroll)}
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
				data-testid={bodyTestId}
			>
				<div
					className="relative w-full flex flex-col flex-1"
					key={currentDate.format('YYYY-MM')}
				>
					{rows.map((row) => (
						<HorizontalGridRow
							allDay={row.allDay ?? topLevelAllDay}
							dayMaxEvents={dayMaxEvents}
							days={row.days || topLevelDays || []}
							gridType={gridType}
							key={row.id}
							showDayNumber={row.showDayNumber ?? topLevelShowDayNumber}
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
