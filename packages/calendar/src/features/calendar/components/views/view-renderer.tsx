import type {
	HorizontalRowSpec,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { parseDate, resolveZone, type ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { useMemo } from 'react'
import { GROUPED_HEADER_HEIGHT } from '@/config/constants'
import { AllDayRow } from '@/features/calendar/components/all-day-row/all-day-row'
import { HorizontalGrid } from '@/features/calendar/components/horizontal-grid/horizontal-grid'
import { RESPONSIVE_GUTTER_WIDTH } from '@/features/calendar/components/vertical-grid/gutter'
import { VerticalGrid } from '@/features/calendar/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { ResourceAllDayRows } from './resource-axis'

const RESPONSIVE_ALL_DAY_CLASSES = {
	cell: 'flex-1 min-w-0',
	spacer: RESPONSIVE_GUTTER_WIDTH,
}

const isVerticalSpecs = (
	_specs: VerticalColumnSpec[] | HorizontalRowSpec[],
	engine: 'vertical' | 'horizontal'
): _specs is VerticalColumnSpec[] => engine === 'vertical'

interface EngineViewProps {
	header: React.ReactNode
	composesResourceAxis: boolean
	variant: 'resource' | 'regular'
}

const VerticalEngineView: React.FC<
	EngineViewProps & { specs: VerticalColumnSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
	const { slotDuration, allDaySlot, timezone } = useSmartCalendarContext(
		(c) => ({
			slotDuration: c.slotDuration,
			allDaySlot: c.allDaySlot,
			timezone: c.timezone,
		})
	)
	const zone = resolveZone(timezone)
	const gridType = specs.some((col) => col.gridType === 'hour') ? 'hour' : 'day'
	const eventDays = useMemo(
		() =>
			specs
				.filter((col) => !col.noEvents && col.day)
				.map((col) => (col.day ? parseDate(col.day, zone) : undefined))
				.filter((day): day is ZonedDate => Boolean(day)),
		[specs, zone]
	)
	const gutterCol = specs.find((col) => col.noEvents)
	const usesResponsiveGutter = Boolean(
		gutterCol?.className?.includes(RESPONSIVE_GUTTER_WIDTH)
	)
	let allDayClasses: typeof RESPONSIVE_ALL_DAY_CLASSES | undefined
	if (usesResponsiveGutter) {
		allDayClasses = RESPONSIVE_ALL_DAY_CLASSES
	}
	let allDayRow: React.ReactNode
	const showsAllDayRow = gridType === 'hour' && allDaySlot
	if (showsAllDayRow) {
		allDayRow = composesResourceAxis ? (
			<ResourceAllDayRows columns={specs} />
		) : (
			<AllDayRow classes={allDayClasses} days={eventDays} />
		)
	}
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

const HorizontalEngineView: React.FC<
	EngineViewProps & { specs: HorizontalRowSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
	const gridType = specs.some((row) =>
		row.columns?.some((cell) => cell.gridType === 'hour')
	)
		? 'hour'
		: 'day'
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

const GridlessView: React.FC<{ view: PluginView }> = ({ view }) => {
	const EscapeHatch = view.component
	if (EscapeHatch) {
		return <EscapeHatch />
	}
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

export const ViewRenderer: React.FC<{ view: PluginView }> = ({ view }) => {
	const {
		currentDate,
		firstDayOfWeek,
		hiddenDays,
		businessHours,
		hideNonBusinessHours,
		slotMinTime,
		slotMaxTime,
		resources,
		hasResourceAxis,
		orientation,
		weekViewGranularity,
		timezone,
	} = useSmartCalendarContext((c) => ({
		currentDate: c.currentDate,
		firstDayOfWeek: c.firstDayOfWeek,
		hiddenDays: c.hiddenDays,
		businessHours: c.businessHours,
		hideNonBusinessHours: c.hideNonBusinessHours,
		slotMinTime: c.slotMinTime,
		slotMaxTime: c.slotMaxTime,
		resources: c.resources,
		hasResourceAxis: c.hasResourceAxis,
		orientation: c.orientation,
		weekViewGranularity: c.weekViewGranularity,
		timezone: c.timezone,
	}))

	const config = useMemo<ViewConfig>(
		() => ({
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			slotMinTime,
			slotMaxTime,
			resources,
			hasResourceAxis,
			orientation,
			weekViewGranularity,
			timezone,
		}),
		[
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			slotMinTime,
			slotMaxTime,
			resources,
			hasResourceAxis,
			orientation,
			weekViewGranularity,
			timezone,
		]
	)

	const specs = useMemo(
		() => view.columns?.(currentDate, config),
		[view, currentDate, config]
	)

	const header = useMemo(
		() => view.renderHeader?.({ date: currentDate, config }),
		[view, currentDate, config]
	)

	if (!specs || !view.layout) {
		return <GridlessView view={view} />
	}

	const composesResourceAxis =
		hasResourceAxis && Boolean(view.supportsResources)
	const engine = composesResourceAxis
		? (orientation ?? 'horizontal')
		: view.layout
	const variant = composesResourceAxis ? 'resource' : 'regular'

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
