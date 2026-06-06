import { memo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

interface HorizontalGridHeaderContainerProps {
	children?: React.ReactNode
	className?: string
}

const NoMemoHorizontalGridHeaderContainer = ({
	children,
	className,
}: HorizontalGridHeaderContainerProps) => {
	const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
		(state) => ({
			stickyViewHeader: state.stickyViewHeader,
			viewHeaderClassName: state.viewHeaderClassName,
		})
	)
	return (
		<div
			className={cn(
				'flex h-12 w-fit',
				stickyViewHeader && 'sticky top-0 z-21 bg-background',
				className,
				viewHeaderClassName
			)}
			data-testid="horizontal-grid-header"
		>
			{children}
		</div>
	)
}

export const HorizontalGridHeaderContainer = memo(
	NoMemoHorizontalGridHeaderContainer
)
