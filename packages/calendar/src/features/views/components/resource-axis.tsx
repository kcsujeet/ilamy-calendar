import type {
	HorizontalRowSpec,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	dayKey,
	parseDate,
	resolveZone,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { AllDayCell } from '@/features/views/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/features/views/components/all-day-row/all-day-row'
import {
	GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/features/views/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { keys } from '@/utils/keys.utils'
import { viewHasResourceAxis } from '@/utils/resource-list.utils'
import { ResourceCell } from './resource-cell'

export const RESOURCE_CELL_WIDTH = 'min-w-20 flex-1'

/**
 * Returns the vertical or horizontal resource layout when `config` carries a
 * resource axis, or `null` so the caller renders its non-resource layout.
 */
export const resolveResourceLayout = (
	config: ViewConfig,
	builders: {
		vertical: (resources: Resource[]) => VerticalColumnSpec[]
		horizontal: (resources: Resource[]) => HorizontalRowSpec[]
	}
): VerticalColumnSpec[] | HorizontalRowSpec[] | null => {
	if (!viewHasResourceAxis(config)) {
		return null
	}
	const resources = config.resources ?? []
	if (config.orientation === 'vertical') {
		return builders.vertical(resources)
	}
	return builders.horizontal(resources)
}

interface ResourceHorizontalRowsOptions {
	resources: Resource[]
	days: ZonedDate[] | ZonedDate[][]
	gridType: 'day' | 'hour'
	cellClassName?: string
}

export const resourceHorizontalRows = ({
	resources,
	days,
	gridType,
	cellClassName,
}: ResourceHorizontalRowsOptions): HorizontalRowSpec[] => {
	const columns = days.map((day) => {
		const isArray = Array.isArray(day)
		const refDay = isArray ? day.at(0) : day
		return {
			id: refDay ? keys.col.day(refDay) : 'day-col-unknown',
			day: isArray ? undefined : toOffsetIso(day),
			days: isArray ? day.map(toOffsetIso) : undefined,
			className: cellClassName,
			gridType,
		}
	})

	return resources.map((resource) => ({
		id: String(resource.id),
		resource,
		columns,
	}))
}

type ResourceColumnSeed = Omit<VerticalColumnSpec, 'resource'>

interface ResourceVerticalColumnsOptions {
	resources: Resource[]
	gutter: VerticalColumnSpec
	columnsFor: (resource: Resource) => ResourceColumnSeed | ResourceColumnSeed[]
}

export const resourceVerticalColumns = ({
	resources,
	gutter,
	columnsFor,
}: ResourceVerticalColumnsOptions): VerticalColumnSpec[] => [
	gutter,
	...resources.flatMap((resource) => {
		const seeds = columnsFor(resource)
		const seedList = Array.isArray(seeds) ? seeds : [seeds]
		return seedList.map((seed) => ({ ...seed, resource }))
	}),
]

export const ResourceColumnsHeader: React.FC<{ resources: Resource[] }> = ({
	resources,
}) => (
	<div
		className={'flex gap-px bg-border h-12 flex-1'}
		data-testid={keys.header.resource.columnsHeader}
	>
		<div
			className={cn(
				'shrink-0 sticky top-0 left-0 bg-background z-20',
				GUTTER_WIDTH,
				STICKY_GUTTER_SHADOW
			)}
		/>
		{resources.map((resource) => (
			<ResourceCell
				className={cn(RESOURCE_CELL_WIDTH, 'bg-background')}
				key={keys.listKey('resource-cell', resource.id)}
				resource={resource}
			/>
		))}
	</div>
)

export const ResourcesCornerCell: React.FC = () => {
	const { t } = useSmartCalendarContext((c) => ({ t: c.t }))
	return (
		<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
			<div className="text-sm truncate px-1 min-w-0">{t('resources')}</div>
		</div>
	)
}

interface ResourceAllDayGroup {
	resource: Resource
	days: ZonedDate[]
	seenDayKeys: Set<string>
}

export const ResourceAllDayRows: React.FC<{
	columns: VerticalColumnSpec[]
}> = ({ columns }) => {
	const timezone = useSmartCalendarContext((c) => c.timezone)
	const zone = resolveZone(timezone)
	const groups: ResourceAllDayGroup[] = []
	const groupsByResourceId = new Map<string | number, ResourceAllDayGroup>()

	for (const column of columns) {
		if (!column.resource || column.noEvents || !column.day) {
			continue
		}
		const zonedDay = parseDate(column.day, zone)
		if (!zonedDay) {
			continue
		}
		let group = groupsByResourceId.get(column.resource.id)
		if (!group) {
			group = { resource: column.resource, days: [], seenDayKeys: new Set() }
			groupsByResourceId.set(column.resource.id, group)
			groups.push(group)
		}
		const columnKey = dayKey(zonedDay)
		if (!group.seenDayKeys.has(columnKey)) {
			group.seenDayKeys.add(columnKey)
			group.days.push(zonedDay)
		}
	}

	return (
		<div className="flex w-full gap-px bg-border">
			<AllDayCell />
			{groups.map(({ resource, days }) => (
				<AllDayRow
					classes={{
						cell: cn('min-w-20', days.length > 1 && 'flex-1'),
					}}
					days={days}
					key={keys.allDayRow(resource.id)}
					resource={resource}
					showSpacer={false}
				/>
			))}
		</div>
	)
}
