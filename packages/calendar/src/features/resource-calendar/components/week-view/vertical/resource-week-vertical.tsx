import type React from 'react'
import { useMemo } from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { keys } from '@/lib/utils/keys'
import { useResourceWeekViewData } from '../use-resource-week-view-data'
import { ResourceWeekVerticalDayHeader } from './resource-week-vertical-day-header'
import { ResourceWeekVerticalResourceHeader } from './resource-week-vertical-resource-header'
import { useResourceWeekVerticalData } from './use-resource-week-vertical-data'

export const ResourceWeekVertical: React.FC = () => {
	const { isHourly, resources, weekDays, visibleDays } =
		useResourceWeekViewData()
	const { hours, columns } = useResourceWeekVerticalData()
	const { slotDuration } = useSmartCalendarContext()

	const firstCol = useMemo(
		() =>
			gutterColumn({
				days: isHourly ? hours : weekDays,
				gridType: isHourly ? 'hour' : 'day',
				renderLabel: isHourly
					? undefined
					: (date: Dayjs) => (
							<>
								<span>{date.format('ddd')}</span>
								<span>{date.format('D')}</span>
							</>
						),
			}),
		[hours, isHourly, weekDays]
	)

	const allDayRow = useMemo(() => {
		if (!isHourly) return undefined
		return (
			<div className="flex w-full">
				<AllDayCell />
				{resources.map((resource) => (
					<AllDayRow
						classes={{ cell: 'min-w-20 flex-1 border-r!' }}
						days={visibleDays}
						key={keys.allDayRow(resource.id)}
						resource={resource}
						showSpacer={false}
					/>
				))}
			</div>
		)
	}, [isHourly, resources, visibleDays])

	return (
		<VerticalGrid
			allDayRow={allDayRow}
			classes={{ header: isHourly ? 'h-24' : 'h-12' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-week"
			gridType={isHourly ? 'hour' : 'day'}
			slotDurationMinutes={slotDuration}
		>
			<div className="flex-1 flex flex-col">
				<ResourceWeekVerticalResourceHeader
					resources={resources}
					visibleDays={visibleDays}
				/>
				{isHourly && <ResourceWeekVerticalDayHeader columns={columns} />}
			</div>
		</VerticalGrid>
	)
}
