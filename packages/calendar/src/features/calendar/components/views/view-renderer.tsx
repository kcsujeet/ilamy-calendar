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
	} = useSmartCalendarContext((c) => ({
		currentDate: c.currentDate,
		firstDayOfWeek: c.firstDayOfWeek,
		hiddenDays: c.hiddenDays,
		businessHours: c.businessHours,
		hideNonBusinessHours: c.hideNonBusinessHours,
		slotDuration: c.slotDuration,
		resources: c.resources,
		orientation: c.orientation,
	}))

	const config = useMemo<ViewConfig>(
		() => ({
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
		}),
		[
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
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
		const allDayClasses =
			eventDays.length > 1
				? { cell: 'flex-1 min-w-0', spacer: RESPONSIVE_GUTTER_WIDTH }
				: undefined

		return (
			<VerticalGrid
				allDayRow={
					gridType === 'hour' ? (
						<AllDayRow classes={allDayClasses} days={eventDays} />
					) : undefined
				}
				classes={{ header: 'w-full', body: 'w-full', allDay: 'w-full' }}
				columns={specs}
				gridType={gridType}
				slotDurationMinutes={slotDuration}
				variant={variant}
			>
				{header}
			</VerticalGrid>
		)
	}

	return (
		<HorizontalGrid
			classes={{ body: 'w-full', header: 'w-full' }}
			rows={specs}
			variant={variant}
		>
			{header}
		</HorizontalGrid>
	)
}
