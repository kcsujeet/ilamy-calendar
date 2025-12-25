import type React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { HorizontalGridHeaderContainer } from './horizontal-grid-header-container'
import {
	HorizontalGridRow,
	type HorizontalGridRowProps,
} from './horizontal-grid-row'

const BODY_HEIGHT = 'h-[calc(100%-3rem)]'

interface HorizontalGridProps {
	rows: HorizontalGridRowProps[]
	children?: React.ReactNode
	classes?: { header?: string; body?: string }
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
	const { currentDate } = useSmartCalendarContext((state) => ({
		currentDate: state.currentDate,
	}))

	const isResourceCalendar = variant === 'resource'
	const isRegularCalendar = !isResourceCalendar

	const header = children && (
		<HorizontalGridHeaderContainer className={classes?.header}>
			{children}
		</HorizontalGridHeaderContainer>
	)

	return (
		<div className="h-full" data-testid="horizontal-grid-container">
			{/**
			 * header row is rendered outside scroll area for regular calendar
			 */}
			{isRegularCalendar && header}

			<ScrollArea
				className={cn(
					'h-full',
					isRegularCalendar && 'overflow-auto',
					isRegularCalendar && BODY_HEIGHT // scroll area becomes body in regular calendar
				)}
				data-testid="horizontal-grid-scroll"
				viewPortProps={{ className: '*:flex! *:flex-col! *:min-h-full' }}
			>
				{/**
				 * header row for resource calendar inside scroll area
				 * */}
				{isResourceCalendar && header}

				{/* Calendar area with scroll */}
				<div
					className={cn(
						'flex flex-1 w-fit',
						isResourceCalendar && BODY_HEIGHT, // this becomes body in resource calendar
						classes?.body
					)}
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
		</div>
	)
}
