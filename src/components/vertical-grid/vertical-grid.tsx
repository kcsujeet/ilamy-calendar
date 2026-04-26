import type React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'
import { VerticalGridCol, type VerticalGridColProps } from './vertical-grid-col'
import { VerticalGridHeaderContainer } from './vertical-grid-header-container'

interface VerticalGridProps {
	columns: VerticalGridColProps[]
	children?: React.ReactNode
	gridType?: 'day' | 'hour'
	variant?: 'regular' | 'resource'
	classes?: { header?: string; body?: string; allDay?: string }
	allDayRow?: React.ReactNode
	/**
	 * Optional array of minute slots by which the hour is divided
	 * e.g., [0, 15, 30, 45] for quarter-hour slots
	 */
	cellSlots?: number[]
	style?: React.CSSProperties
}

export const VerticalGrid: React.FC<VerticalGridProps> = ({
	columns,
	children,
	gridType = 'day',
	variant = 'resource',
	classes,
	allDayRow,
	cellSlots,
	style,
}) => {
	const isResourceCalendar = variant === 'resource'
	const isRegularCalendar = !isResourceCalendar
	// Triggered when `hideNonBusinessHours` filters every column to zero hours
	// (e.g. business hours `startTime: 0, endTime: 0`). The all-day row takes
	// the freed vertical space so the view doesn't render an empty time grid.
	const expandAllDayRow = columns.every((c) => !c.days?.length)

	const header = children && (
		<VerticalGridHeaderContainer
			allDayRow={allDayRow}
			classes={{ header: classes?.header, allDay: classes?.allDay }}
			expandAllDayRow={expandAllDayRow}
		>
			{children}
		</VerticalGridHeaderContainer>
	)

	// When all columns are empty (no hours to display), skip the ScrollArea
	// entirely so the header (with the expanded all-day row) takes the full
	// container height. h-full on a flex child only resolves correctly against
	// a parent with a definite height, and Radix's Viewport wrapper has only
	// min-height — not explicit height — which is why the all-day row's
	// flex-1 wouldn't grow when nested inside the ScrollArea.
	if (expandAllDayRow && header) {
		return (
			<div
				className="h-full flex flex-col"
				data-testid="vertical-grid-container"
				style={style}
			>
				{header}
			</div>
		)
	}

	return (
		<div
			className="h-full flex flex-col"
			data-testid="vertical-grid-container"
			style={style}
		>
			{/* header row */}
			{isRegularCalendar && header}

			<ScrollArea
				className={cn('h-full', isRegularCalendar && 'overflow-auto')}
				data-testid="vertical-grid-scroll"
				viewPortProps={{ className: '*:flex! *:flex-col! *:min-h-full' }}
			>
				{/* header row for resource calendar inside scroll area */}
				{isResourceCalendar && header}
				{/* Calendar area with scroll */}
				<div
					className={cn('flex flex-1 min-w-full w-fit', classes?.body)}
					data-testid="vertical-grid-body"
				>
					{/* Day columns with time slots */}
					{columns.map((column, index) => (
						<VerticalGridCol
							key={keys.listKey(column.id, index)}
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
		</div>
	)
}
