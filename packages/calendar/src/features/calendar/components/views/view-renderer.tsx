import type {
	HorizontalRowSpec,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import type React from 'react'
import { useMemo } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { RESPONSIVE_GUTTER_WIDTH } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { ResourceAllDayRows } from './resource-axis'

// Contract rule, not a runtime check: a view declaring `layout: 'vertical'`
// returns VerticalColumnSpec[] from columns() (see PluginView.columns TSDoc).
const isVerticalSpecs = (
	_specs: VerticalColumnSpec[] | HorizontalRowSpec[],
	engine: 'vertical' | 'horizontal'
): _specs is VerticalColumnSpec[] => engine === 'vertical'

/**
 * The three-way view dispatcher: 'vertical' → VerticalGrid, 'horizontal' →
 * HorizontalGrid, no columns/layout → the view's `component` (escape hatch).
 * Engine rule: resources + a resource-capable view → the calendar-level
 * `orientation`; otherwise the view's own `layout`.
 */
export const ViewRenderer: React.FC<{ view: PluginView }> = ({ view }) => {
	const {
		currentDate,
		firstDayOfWeek,
		hiddenDays,
		businessHours,
		hideNonBusinessHours,
		slotDuration,
		resources,
		orientation,
		weekViewGranularity,
	} = useSmartCalendarContext((c) => ({
		currentDate: c.currentDate,
		firstDayOfWeek: c.firstDayOfWeek,
		hiddenDays: c.hiddenDays,
		businessHours: c.businessHours,
		hideNonBusinessHours: c.hideNonBusinessHours,
		slotDuration: c.slotDuration,
		resources: c.resources,
		orientation: c.orientation,
		weekViewGranularity: c.weekViewGranularity,
	}))

	const config = useMemo<ViewConfig>(
		() => ({
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
			weekViewGranularity,
		}),
		[
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
			weekViewGranularity,
		]
	)

	// Memoized so the grids' memo()d columns/rows see stable references
	// (the PR #190 stale-useMemo lesson: deps are exhaustive).
	const specs = useMemo(
		() => view.columns?.(currentDate, config),
		[view, currentDate, config]
	)

	if (!specs || !view.layout) {
		const EscapeHatch = view.component
		return <EscapeHatch />
	}

	const hasResources = Boolean(resources?.length)
	const composesResourceAxis = hasResources && Boolean(view.supportsResources)
	// The locked engine rule.
	const engine = composesResourceAxis
		? (orientation ?? 'horizontal')
		: view.layout
	const variant = composesResourceAxis ? 'resource' : 'regular'
	const header = view.renderHeader?.({ date: currentDate, config })

	if (isVerticalSpecs(specs, engine)) {
		const gridType = specs.some((col) => col.gridType === 'hour')
			? 'hour'
			: 'day'
		const eventDays = specs
			.filter((col) => !col.noEvents)
			.map((col) => col.day)
			.filter((day): day is Dayjs => Boolean(day))
		// The all-day spacer must mirror the gutter column's width. Views on the
		// responsive gutter (week) need the matching responsive spacer plus
		// shrinkable cells — regardless of how many days hiddenDays leaves
		// visible; views on the fixed-width gutter (day) align with the
		// AllDayCell default already.
		const gutterCol = specs.find((col) => col.noEvents)
		const usesResponsiveGutter = Boolean(
			gutterCol?.className?.includes(RESPONSIVE_GUTTER_WIDTH)
		)
		const allDayClasses = usesResponsiveGutter
			? { cell: 'flex-1 min-w-0', spacer: RESPONSIVE_GUTTER_WIDTH }
			: undefined
		// Resource columns get one all-day row per resource (derived from the
		// resource identity the specs carry); regular columns share one row.
		let allDayRow: React.ReactNode
		if (gridType === 'hour') {
			allDayRow = composesResourceAxis ? (
				<ResourceAllDayRows columns={specs} />
			) : (
				<AllDayRow classes={allDayClasses} days={eventDays} />
			)
		}
		// Resource grids rely on the min-w-full/w-fit defaults so wide column
		// sets keep header and body aligned while scrolling.
		const verticalClasses = composesResourceAxis
			? undefined
			: { header: 'w-full', body: 'w-full', allDay: 'w-full' }

		return (
			<VerticalGrid
				allDayRow={allDayRow}
				classes={verticalClasses}
				columns={specs}
				gridType={gridType}
				slotDurationMinutes={slotDuration}
				variant={variant}
			>
				{header}
			</VerticalGrid>
		)
	}

	const horizontalGridType = specs.some((row) =>
		row.columns?.some((cell) => cell.gridType === 'hour')
	)
		? 'hour'
		: 'day'
	// Grouped cells (a day's hour slots) need the taller two-row header.
	const hasGroupedCells = specs.some((row) =>
		row.columns?.some((cell) => cell.days)
	)
	const horizontalClasses = composesResourceAxis
		? {
				header: cn(hasGroupedCells && 'h-24', 'min-w-full'),
				body: 'min-w-full',
			}
		: { body: 'w-full', header: 'w-full' }

	return (
		<HorizontalGrid
			classes={horizontalClasses}
			dayNumberHeight={composesResourceAxis ? 0 : undefined}
			gridType={horizontalGridType}
			rows={specs}
			variant={variant}
		>
			{header}
		</HorizontalGrid>
	)
}
