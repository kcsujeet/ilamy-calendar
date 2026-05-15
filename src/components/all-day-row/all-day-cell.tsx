import { memo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { WEEK_GUTTER_CELL_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface AllDayCellProps {
	className?: string
	/** When true, width follows the parent week grid track (not spacing-based `w-*`). */
	gridGutter?: boolean
}

const NoMemoAllDayCell: React.FC<AllDayCellProps> = ({
	className,
	gridGutter = false,
}) => {
	const { t } = useSmartCalendarContext()
	return (
		<div
			className={cn(
				'flex items-center justify-center border-r bg-background text-muted-foreground text-center sticky left-0 z-20',
				gridGutter
					? cn(
							WEEK_GUTTER_CELL_CLASS,
							'text-[10px] leading-tight sm:text-xs',
							className
						)
					: cn(
							'shrink-0 sm:text-xs w-10 min-w-10 max-w-10 sm:w-16 sm:min-w-16 sm:max-w-16',
							className
						)
			)}
		>
			{t('allDay')}
		</div>
	)
}

export const AllDayCell = memo(NoMemoAllDayCell)
