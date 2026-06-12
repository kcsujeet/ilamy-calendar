import type {
	HorizontalRowSpec,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useMemo } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { RESPONSIVE_GUTTER_WIDTH } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { GROUPED_HEADER_HEIGHT } from '@/lib/constants'
import { ResourceAllDayRows } from './resource-axis'

// Contract rule, not a runtime check: a view declaring `layout: 'vertical'`
// returns VerticalColumnSpec[] from columns() (see PluginView.columns TSDoc).
const isVerticalSpecs = (
	_specs: VerticalColumnSpec[] | HorizontalRowSpec[],
	engine: 'vertical' | 'horizontal'
): _specs is VerticalColumnSpec[] => engine === 'vertical'

interface EngineViewProps {
	header: React.ReactNode
	composesResourceAxis: boolean
	variant: 'resource' | 'regular'
}

/** The 'vertical' engine branch: column specs → VerticalGrid. */
const VerticalEngineView: React.FC<
	EngineViewProps & { specs: VerticalColumnSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
	const { slotDuration } = useSmartCalendarContext((c) => ({
		slotDuration: c.slotDuration,
	}))
	const gridType = specs.some((col) => col.gridType === 'hour') ? 'hour' : 'day'
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

/** The 'horizontal' engine branch: row specs → HorizontalGrid. */
const HorizontalEngineView: React.FC<
	EngineViewProps & { specs: HorizontalRowSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
	const gridType = specs.some((row) =>
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
				header: cn(hasGroupedCells && GROUPED_HEADER_HEIGHT, 'min-w-full'),
				body: 'min-w-full',
			}
		: { body: 'w-full', header: 'w-full' }

	return (
		<HorizontalGrid
			classes={horizontalClasses}
			dayNumberHeight={composesResourceAxis ? 0 : undefined}
			gridType={gridType}
			rows={specs}
			variant={variant}
		>
			{header}
		</HorizontalGrid>
	)
}

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
		resources,
		orientation,
		weekViewGranularity,
	} = useSmartCalendarContext((c) => ({
		currentDate: c.currentDate,
		firstDayOfWeek: c.firstDayOfWeek,
		hiddenDays: c.hiddenDays,
		businessHours: c.businessHours,
		hideNonBusinessHours: c.hideNonBusinessHours,
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

	// Memoized so the grids' memo()d columns/rows see stable references;
	// deps are exhaustive.
	const specs = useMemo(
		() => view.columns?.(currentDate, config),
		[view, currentDate, config]
	)

	if (!specs || !view.layout) {
		const EscapeHatch = view.component
		if (EscapeHatch) {
			return <EscapeHatch />
		}
		// Guarded `typeof process` check: the published bundle ships this line
		// as-is, so bundler-less ESM consumers must not crash on bare `process`.
		const isDevBuild =
			typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
		if (isDevBuild) {
			// biome-ignore lint/suspicious/noConsole: deliberate DX guard (view contract)
			console.warn(
				`[@ilamy/calendar] view "${view.name}" declares neither \`columns\` + \`layout\` nor \`component\` — rendering nothing.`
			)
		}
		return null
	}

	const hasResources = Boolean(resources?.length)
	const composesResourceAxis = hasResources && Boolean(view.supportsResources)
	// With resources on a resource-capable view the user's `orientation` picks
	// the engine; otherwise the view's own `layout` does.
	const engine = composesResourceAxis
		? (orientation ?? 'horizontal')
		: view.layout
	const variant = composesResourceAxis ? 'resource' : 'regular'
	const header = view.renderHeader?.({ date: currentDate, config })

	if (isVerticalSpecs(specs, engine)) {
		return (
			<VerticalEngineView
				composesResourceAxis={composesResourceAxis}
				header={header}
				specs={specs}
				variant={variant}
			/>
		)
	}

	return (
		<HorizontalEngineView
			composesResourceAxis={composesResourceAxis}
			header={header}
			specs={specs}
			variant={variant}
		/>
	)
}
