import { memo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

import { cn } from '@/lib/utils'

interface VerticalGridHeaderContainerProps {
	children?: React.ReactNode
	classes?: { header?: string; allDay?: string }
	allDayRow?: React.ReactNode
}

const NoMemoVerticalGridHeaderContainer: React.FC<
	VerticalGridHeaderContainerProps
> = ({ children, classes, allDayRow }) => {
	const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
		(state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
		})
	)

	return (
		<div
			className={cn(
				stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
				viewHeaderClassName
			)}
		>
			<div
				className={cn('h-12 border-b w-fit', classes?.header)}
				data-testid="vertical-grid-header"
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
