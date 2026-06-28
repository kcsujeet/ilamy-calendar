import { cn } from '@ilamy/ui/lib/utils'
import { memo } from 'react'
import { STICKY_GUTTER_SHADOW } from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface AllDayCellProps {
	className?: string
}

const NoMemoAllDayCell: React.FC<AllDayCellProps> = ({ className }) => {
	const { t } = useSmartCalendarContext()
	return (
		<div
			className={cn(
				'w-16 shrink-0 sticky left-0 bg-background z-20 flex items-center justify-center px-1 text-xs text-muted-foreground',
				STICKY_GUTTER_SHADOW,
				className
			)}
		>
			<span className="truncate">{t('allDay')}</span>
		</div>
	)
}

export const AllDayCell = memo(NoMemoAllDayCell)
