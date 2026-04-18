import type React from 'react'
import { useMemo } from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { HourLabel } from '@/components/hour-label/hour-label'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { useResourceWeekViewData } from '../use-resource-week-view-data'
import { ResourceWeekVerticalDayHeader } from './resource-week-vertical-day-header'
import { ResourceWeekVerticalResourceHeader } from './resource-week-vertical-resource-header'
import { useResourceWeekVerticalData } from './use-resource-week-vertical-data'

export const ResourceWeekVertical: React.FC = () => {
	const { isHourly, resources, weekDays, visibleDays } =
		useResourceWeekViewData()
	const { hours, columns } = useResourceWeekVerticalData()

	const firstCol = useMemo(
		() => ({
			id: isHourly ? 'time-col' : 'date-col',
			days: isHourly ? hours : weekDays,
			day: undefined,
			className:
				'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20',
			gridType: isHourly ? ('hour' as const) : ('day' as const),
			noEvents: true,
			renderCell: (date: Dayjs) => (
				<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
					{isHourly ? (
						<HourLabel date={date} />
					) : (
						<>
							<span>{date.format('ddd')}</span>
							<span>{date.format('M/D')}</span>
						</>
					)}
				</div>
			),
		}),
		[hours, isHourly, weekDays]
	)

	const allDayRow = useMemo(() => {
		if (!isHourly) return undefined
		return (
			<div className="flex">
				<AllDayCell />
				{resources.map((resource) => (
					<AllDayRow
						classes={{ cell: 'min-w-50' }}
						days={visibleDays}
						key={`resource-week-allday-row-${resource.id}`}
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
