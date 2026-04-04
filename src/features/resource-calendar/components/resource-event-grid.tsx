import type React from 'react'
import { memo, useMemo, useRef } from 'react'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'

interface ResourceEventGridProps {
	/**
	 * Array of days to display in the grid
	 */
	days: Dayjs[] | Dayjs[][]
	/** The type of grid to display - 'day' for day view, 'hour' for week view
	 * (affects event positioning logic)
	 */
	gridType?: 'day' | 'hour'
	/**
	 * Children will be rendered as headers above the grid
	 * (e.g., for day names in month view)
	 */
	children?: React.ReactNode
	classes?: { header?: string; body?: string; scroll?: string; cell?: string }
}

const NoMemoResourceEventGrid: React.FC<ResourceEventGridProps> = ({
	days,
	gridType = 'day',
	children,
	classes,
}) => {
	const { getVisibleResources } = useSmartCalendarContext()

	const rawVisibleResources = getVisibleResources()
	// Stabilize the array reference — getVisibleResources() returns a new array
	// on every call even when the contents haven't changed.
	const resourcesRef = useRef<Resource[]>(rawVisibleResources)
	const prevIds = resourcesRef.current.map((r) => r.id).join(',')
	const nextIds = rawVisibleResources.map((r) => r.id).join(',')
	if (prevIds !== nextIds) {
		resourcesRef.current = rawVisibleResources
	}
	const visibleResources = resourcesRef.current

	const columns = useMemo(
		() =>
			days.map((day) => {
				const isArray = Array.isArray(day)
				return {
					id: `col-${isArray ? day[0]?.format('YYYY-MM-DD') : day.toISOString()}`,
					day: isArray ? undefined : day,
					days: isArray ? day : undefined,
					className: classes?.cell,
					gridType,
				}
			}),
		[days, classes?.cell, gridType]
	)

	const rows = useMemo(
		() =>
			visibleResources.map((resource) => ({
				id: resource.id,
				title: resource.title,
				resource: resource,
				columns,
			})),
		[visibleResources, columns]
	)

	return (
		<HorizontalGrid
			classes={classes}
			dayNumberHeight={0}
			gridType={gridType}
			rows={rows}
		>
			{children}
		</HorizontalGrid>
	)
}

export const ResourceEventGrid = memo(NoMemoResourceEventGrid)
