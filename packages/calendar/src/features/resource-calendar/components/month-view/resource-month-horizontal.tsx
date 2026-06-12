import type React from 'react'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { getMonthDays } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

export const ResourceMonthHorizontal: React.FC = () => {
	const { currentDate, t } = useSmartCalendarContext()

	// Generate calendar grid - days of the month
	const monthDays = useMemo<Dayjs[]>(() => {
		return getMonthDays(currentDate)
	}, [currentDate])

	return (
		<ResourceEventGrid days={monthDays}>
			<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
				<div className="text-sm truncate px-1 min-w-0">{t('resources')}</div>
			</div>

			{monthDays.map((day, index) => {
				const key = `resource-month-header-${day.toISOString()}`

				return (
					<AnimatedSection
						className="w-20 border-b border-r shrink-0 flex items-center justify-center flex-col"
						delay={index * HEADER_STAGGER_DELAY}
						key={keys.listKey(key, 'animated')}
						transitionKey={keys.listKey(key, 'motion')}
					>
						<div className="text-xs font-medium">{day.format('D')}</div>
						<div className="text-xs text-muted-foreground">
							{day.format('ddd')}
						</div>
					</AnimatedSection>
				)
			})}
		</ResourceEventGrid>
	)
}
