import type React from 'react'
import { memo, useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { RESOURCE_CORNER } from '@/lib/constants'
import { getMonthDays } from '@/lib/utils/date-utils'

const NoMemoResourceMonthHorizontal: React.FC = () => {
	const { currentDate, t } = useSmartCalendarContext()

	const monthDays = useMemo<Dayjs[]>(() => {
		return getMonthDays(currentDate)
	}, [currentDate])

	return (
		<ResourceEventGrid days={monthDays}>
			<div className={RESOURCE_CORNER}>
				<div className="text-sm">{t('resources')}</div>
			</div>

			{monthDays.map((day, index) => {
				const key = `resource-month-header-${day.toISOString()}`

				return (
					<AnimatedSection
						className="w-20 border-b border-r shrink-0 flex items-center justify-center flex-col"
						delay={index * 0.05}
						key={key}
						transitionKey={key}
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

export const ResourceMonthHorizontal = memo(NoMemoResourceMonthHorizontal)
