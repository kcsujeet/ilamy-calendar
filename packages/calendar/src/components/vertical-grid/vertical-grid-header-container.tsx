import { cn } from '@ilamy/ui/lib/utils'
import { memo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface VerticalGridHeaderContainerProps {
	children?: React.ReactNode
	classes?: { header?: string; allDay?: string }
	allDayRow?: React.ReactNode
	expandAllDayRow?: boolean
}

const NoMemoVerticalGridHeaderContainer: React.FC<
	VerticalGridHeaderContainerProps
> = ({ children, classes, allDayRow, expandAllDayRow = false }) => {
	const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
		(state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
		})
	)
	const TotalWidthClass = 'min-w-full w-fit'
	return (
		<div
			className={cn(
				expandAllDayRow && 'flex h-full flex-col',
				stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
				viewHeaderClassName
			)}
		>
			<div
				className={cn('min-h-12 border-b', TotalWidthClass, classes?.header)}
				data-testid="vertical-grid-header"
			>
				{children}
			</div>
			{/* All-day row. border-b: the all-day/time-grid separator, owned here so
			    it spans the full width below the sticky gutter and is drawn once. */}
			{allDayRow && (
				<div
					className={cn(
						'flex min-h-12 border-b',
						TotalWidthClass,
						expandAllDayRow && 'flex-1 overflow-hidden',
						classes?.allDay
					)}
					data-testid="vertical-grid-all-day"
				>
					{allDayRow}
				</div>
			)}
		</div>
	)
}

export const VerticalGridHeaderContainer = memo(
	NoMemoVerticalGridHeaderContainer
)
