import type React from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { ResourceCell } from '@/components/resource-cell'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { TODAY_HIGHLIGHT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { TimeFormat } from '@/types'

/** Resource header row used in vertical views (day + month) */
export const ResourceVerticalHeader: React.FC<{
	resources: Resource[]
	'data-testid'?: string
}> = ({ resources, 'data-testid': testId }) => (
	<div
		className="flex border-b h-12 flex-1"
		data-testid={testId ?? 'resource-vertical-header'}
	>
		<div className="shrink-0 border-r w-16 sticky top-0 left-0 bg-background z-20" />
		{resources.map((resource) => (
			<ResourceCell
				className="min-w-50 flex-1"
				key={`resource-cell-${resource.id}`}
				resource={resource}
			/>
		))}
	</div>
)

/** All-day row with resource columns, used in vertical day + week views */
export const ResourceAllDaySection: React.FC<{
	resources: Resource[]
	days: Dayjs[]
}> = ({ resources, days }) => (
	<div className="flex">
		<AllDayCell />
		{resources.map((resource) => (
			<AllDayRow
				classes={{ cell: 'min-w-50' }}
				days={days}
				key={`resource-allday-row-${resource.id}`}
				resource={resource}
				showSpacer={false}
			/>
		))}
	</div>
)

/** Time header row with hour labels, used in horizontal day + week views */
export const TimeHeaderRow: React.FC<{
	hours: Dayjs[]
	timeFormat: TimeFormat
	testIdPrefix: string
	className?: string
}> = ({ hours, timeFormat, testIdPrefix, className }) => (
	<div className={cn('flex h-12', className)}>
		{hours.map((col) => (
			<div
				className={cn(
					'min-w-20 flex-1 border-b border-r last:border-r-0 flex items-center justify-center text-xs shrink-0',
					col.isSame(dayjs(), 'hour') && `${TODAY_HIGHLIGHT} font-medium`
				)}
				data-testid={`${testIdPrefix}-time-label-${col.format('HH')}`}
				key={`${testIdPrefix}-header-${col.toISOString()}`}
			>
				{col.format(timeFormat === '12-hour' ? 'h A' : 'H')}
			</div>
		))}
	</div>
)
