import type {
	CalendarEvent,
	CalendarView,
	DomCalendarOptions,
	Resource,
} from '@ilamy/calendar'
import { type CalendarThemeAdapter, IlamyCalendar } from '@ilamy/calendar/react'
import { Globe2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
	CalendarMode,
	FrameworkOption,
	PlaygroundSettings,
} from '../../../types/settings-form.types'
import type {
	EventHandler,
	SharedCalendarProps,
} from '../utils/calendar-display.utils'
import { FrameworkCalendarHost } from './framework-calendar-host'

interface MultiZoneStageCardProps {
	timezone: string
	subtitle: string
	children: ReactNode
}

function MultiZoneStageCard({
	timezone,
	subtitle,
	children,
}: MultiZoneStageCardProps) {
	return (
		<div className="min-w-0 flex flex-col gap-2">
			<div className="flex items-center justify-between px-1">
				<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
					<Globe2 aria-hidden="true" className="size-3 mr-1" />
					{timezone}
				</span>
				<span className="text-[11px] text-muted-foreground">{subtitle}</span>
			</div>
			{children}
		</div>
	)
}

function mergeThemeAdapter(
	shared: SharedCalendarProps,
	overrideAdapter?: CalendarThemeAdapter
): SharedCalendarProps {
	if (!overrideAdapter) return shared
	return {
		...shared,
		unstyled: Boolean(overrideAdapter.unstyled ?? shared.unstyled),
		slotProps: overrideAdapter.slotProps ?? shared.slotProps,
	}
}

export interface CalendarStageProps {
	values: PlaygroundSettings
	activeFrameworkMeta: FrameworkOption
	shared: SharedCalendarProps
	overrideAdapter?: CalendarThemeAdapter
	calendarKey: string
	resourceInitialView: CalendarView
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
	regularEventClick: EventHandler | undefined
	resourceEventClick: EventHandler | undefined
	renderResource: ((resource: Resource) => ReactNode) | undefined
	buildDomOptions: (
		override?: Partial<DomCalendarOptions>
	) => DomCalendarOptions
}

interface CalendarSurfaceOverride {
	instanceKey: string
	timezone?: string
	isResource?: boolean
}

function CalendarSurface({
	stage,
	override,
}: {
	stage: CalendarStageProps
	override: CalendarSurfaceOverride
}) {
	const { values } = stage
	if (values.framework !== 'react') {
		let domOverride: Partial<DomCalendarOptions> | undefined
		if (override.isResource) {
			domOverride = {
				events: stage.resourceEvents,
				resources: stage.activeResources,
				initialView: stage.resourceInitialView,
			}
		} else if (override.timezone) {
			domOverride = { timezone: override.timezone }
		}
		return (
			<FrameworkCalendarHost
				framework={values.framework}
				height={values.calendarHeight}
				options={stage.buildDomOptions(domOverride)}
			/>
		)
	}

	const effectiveShared = mergeThemeAdapter(stage.shared, stage.overrideAdapter)
	if (override.isResource) {
		return (
			<div
				className="overflow-clip relative"
				style={{ height: values.calendarHeight }}
			>
				<IlamyCalendar
					{...effectiveShared}
					events={stage.resourceEvents}
					initialView={stage.resourceInitialView}
					key={override.instanceKey}
					onEventClick={stage.resourceEventClick}
					orientation={values.orientation}
					renderResource={stage.renderResource}
					resources={stage.activeResources}
					weekViewGranularity={values.weekViewGranularity}
				/>
			</div>
		)
	}

	return (
		<div
			className="overflow-clip relative"
			style={{ height: values.calendarHeight }}
		>
			<IlamyCalendar
				{...effectiveShared}
				events={stage.customEvents}
				initialView={values.initialView}
				key={override.instanceKey}
				onEventClick={stage.regularEventClick}
				timezone={override.timezone ?? effectiveShared.timezone}
			/>
		</div>
	)
}

const renderRegularStage = (stage: CalendarStageProps): ReactNode => (
	<CalendarSurface
		override={{ instanceKey: stage.calendarKey }}
		stage={stage}
	/>
)

const renderResourceStage = (stage: CalendarStageProps): ReactNode => (
	<CalendarSurface
		override={{
			instanceKey: `resource-${stage.calendarKey}-${stage.values.orientation}`,
			isResource: true,
		}}
		stage={stage}
	/>
)

const renderMultiZoneStage = (stage: CalendarStageProps): ReactNode => {
	const { values, activeFrameworkMeta, calendarKey } = stage
	let primarySubtitle = 'Shared events · isolated clock'
	if (values.framework !== 'react') {
		primarySubtitle = `${activeFrameworkMeta.label} ${activeFrameworkMeta.version} · isolated clock`
	}

	return (
		<div className="grid gap-4 xl:grid-cols-2" data-testid="multi-zone-stage">
			<MultiZoneStageCard subtitle={primarySubtitle} timezone={values.timezone}>
				<CalendarSurface
					override={{
						instanceKey: `left-${calendarKey}`,
						timezone: values.timezone,
					}}
					stage={stage}
				/>
			</MultiZoneStageCard>
			<MultiZoneStageCard
				subtitle="Zero global timezone state"
				timezone={values.secondaryTimezone}
			>
				<CalendarSurface
					override={{
						instanceKey: `right-${calendarKey}`,
						timezone: values.secondaryTimezone,
					}}
					stage={stage}
				/>
			</MultiZoneStageCard>
		</div>
	)
}

const STAGE_RENDERERS: Record<
	CalendarMode,
	(stage: CalendarStageProps) => ReactNode
> = {
	regular: renderRegularStage,
	resource: renderResourceStage,
	'multi-zone': renderMultiZoneStage,
}

export function CalendarStage(props: CalendarStageProps) {
	return STAGE_RENDERERS[props.values.calendarType](props)
}
