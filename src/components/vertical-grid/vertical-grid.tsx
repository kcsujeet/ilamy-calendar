import type React from 'react'
import { useRef } from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { getTimeColumnHours } from '@/components/vertical-grid/scroll-to-current-time'
import { useScrollToCurrentTime } from '@/hooks/use-scroll-to-current-time'
import { HOUR_ROW_HEIGHT_PX } from '@/lib/constants'
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
	/** When set, `vertical-grid-body` uses this `grid-template-columns` (same as week header / all-day). */
	bodyColumnTemplate?: string
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
	bodyColumnTemplate,
}) => {
	const viewportRef = useRef<HTMLDivElement>(null)
	const hourRowCount = getTimeColumnHours(columns)?.length ?? 0
	const bodyHeightStyle =
		hourRowCount > 0
			? { height: `${hourRowCount * HOUR_ROW_HEIGHT_PX}px` }
			: undefined
	useScrollToCurrentTime({
		viewportRef,
		columns,
		gridType,
	})
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
				className="h-full min-h-0"
				data-testid="vertical-grid-scroll"
				type="always"
				viewPortProps={{ className: 'min-h-0' }}
				viewportRef={viewportRef}
			>
				{/* header row for resource calendar inside scroll area */}
				{isResourceCalendar && header}
				{/* Calendar area with scroll */}
				<div
					className={cn(
						bodyColumnTemplate
							? 'grid min-h-0 min-w-0 w-full shrink-0 items-stretch'
							: 'flex min-w-full w-fit shrink-0',
						classes?.body
					)}
					data-testid="vertical-grid-body"
					style={{
						...bodyHeightStyle,
						...(bodyColumnTemplate
							? { gridTemplateColumns: bodyColumnTemplate }
							: undefined),
					}}
				>
					{columns.map((column, index) => (
						<VerticalGridCol
							key={keys.listKey(column.id, index)}
							{...column}
							cellSlots={cellSlots}
							gridCell={Boolean(bodyColumnTemplate)}
							gridType={gridType}
							isLastColumn={index === columns.length - 1}
						/>
					))}
				</div>
				<ScrollBar className="z-30" />
				<ScrollBar className="z-30" orientation="horizontal" />
			</ScrollArea>
		</div>
	)
}
