import type React from 'react'
import { useMemo } from 'react'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getMonthWeeks } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { MonthHeader } from './month-header'

export const MonthView: React.FC = () => {
	const { currentDate, firstDayOfWeek } = useSmartCalendarContext()

	const weeks = useMemo(
		() => getMonthWeeks(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const rows = weeks.map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: days.map((day) => ({
			id: keys.col.day(day),
			day,
			className: 'w-auto',
			gridType: 'day' as const,
		})),
		className: 'flex-1',
		showDayNumber: true,
	}))

	return (
		<HorizontalGrid
			classes={{ body: 'w-full', header: 'w-full' }}
			rows={rows}
			variant="regular"
		>
			<MonthHeader className="h-12" />
		</HorizontalGrid>
	)
}
