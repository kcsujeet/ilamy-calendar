import { memo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

interface AllDayCellProps {
	className?: string
}

const NoMemoAllDayCell: React.FC<AllDayCellProps> = ({ className }) => {
	const { t } = useSmartCalendarContext()
	return (
		<div
			className={cn(
				'flex shrink-0 items-center text-center justify-center border-r bg-background text-muted-foreground sm:text-xs sticky left-0 z-20 w-10 min-w-10 max-w-10 sm:w-16 sm:min-w-16 sm:max-w-16',
				className
			)}
		>
			{t('allDay')}
		</div>
	)
}

export const AllDayCell = memo(NoMemoAllDayCell)
