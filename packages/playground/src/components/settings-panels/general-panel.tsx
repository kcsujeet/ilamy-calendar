import type { Resource } from '@ilamy/calendar'
import { cn } from '@ilamy/ui/lib/utils'
import { useFormContext, useWatch } from 'react-hook-form'
import type { PlaygroundSettings } from '../../types/settings-form'
import { FormButtonGroup } from '../form/form-button-group'
import { FormSelect } from '../form/form-select'
import { ResourcePicker } from '../resource-picker'
import { InitialDateField, SectionHeading } from './settings-fields'
import {
	BASE_VIEW_OPTIONS,
	CALENDAR_HEIGHT_OPTIONS,
	FIRST_DAY_OF_WEEK_OPTIONS,
	LOCALE_OPTIONS,
	ORIENTATION_OPTIONS,
	QUICK_TIMEZONES,
	type SelectOption,
	TIME_FORMAT_OPTIONS,
	TIMEZONE_OPTIONS,
	WEEK_VIEW_GRANULARITY_OPTIONS,
} from './settings-options'

interface GeneralPanelProps {
	resources: Resource[]
	selectedResourceIds: Set<string | number>
	onToggleResource: (id: string | number) => void
}

function buildViewOptions(
	isResource: boolean,
	enableYearPlugin: boolean,
	enableAgendaPlugin: boolean
): SelectOption[] {
	if (isResource) return BASE_VIEW_OPTIONS
	const options: SelectOption[] = [...BASE_VIEW_OPTIONS]
	if (enableYearPlugin) options.push({ value: 'year', label: 'Year' })
	if (enableAgendaPlugin) options.push({ value: 'agenda', label: 'Agenda' })
	return options
}

export function GeneralPanel({
	resources,
	selectedResourceIds,
	onToggleResource,
}: GeneralPanelProps) {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	const calendarType = useWatch({ control, name: 'calendarType' })
	const currentTz = useWatch({ control, name: 'timezone' })
	const enableYearPlugin = useWatch({ control, name: 'enableYearPlugin' })
	const enableAgendaPlugin = useWatch({ control, name: 'enableAgendaPlugin' })
	const isResource = calendarType === 'resource'
	const isMultiZone = calendarType === 'multi-zone'

	const viewOptions = buildViewOptions(
		isResource,
		enableYearPlugin,
		enableAgendaPlugin
	)

	return (
		<>
			<SectionHeading>View &amp; Layout</SectionHeading>
			{isResource && (
				<div className="space-y-3 border-l-2 border-primary/20 pl-3">
					<FormButtonGroup
						label="Resource Orientation"
						name="orientation"
						options={ORIENTATION_OPTIONS}
					/>
					<FormButtonGroup
						label="Week Granularity"
						name="weekViewGranularity"
						options={WEEK_VIEW_GRANULARITY_OPTIONS}
					/>
					<ResourcePicker
						onToggleResource={onToggleResource}
						resources={resources}
						selectedResourceIds={selectedResourceIds}
					/>
				</div>
			)}

			<div className="grid grid-cols-2 gap-3">
				<FormSelect
					label="Initial View"
					name="initialView"
					options={viewOptions}
				/>
				<FormSelect
					label="Week Starts"
					name="firstDayOfWeek"
					options={FIRST_DAY_OF_WEEK_OPTIONS}
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<InitialDateField />
				<FormSelect
					label="Height"
					name="calendarHeight"
					options={CALENDAR_HEIGHT_OPTIONS}
				/>
			</div>

			<SectionHeading>Locale &amp; Timezone (Temporal + Intl)</SectionHeading>
			<div className="grid grid-cols-2 gap-3">
				<FormSelect label="Locale" name="locale" options={LOCALE_OPTIONS} />
				<FormSelect
					label="Time Format"
					name="timeFormat"
					options={TIME_FORMAT_OPTIONS}
				/>
			</div>

			<div className="space-y-1.5">
				<div className="flex flex-wrap gap-1">
					{QUICK_TIMEZONES.map((tz) => {
						let buttonTone =
							'bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
						if (currentTz === tz.value) {
							buttonTone = 'bg-primary text-primary-foreground border-primary'
						}
						return (
							<button
								className={cn(
									'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
									buttonTone
								)}
								key={tz.label}
								onClick={() => setValue('timezone', tz.value)}
								type="button"
							>
								{tz.label}
							</button>
						)
					})}
				</div>
				<FormSelect
					label={isMultiZone ? 'Left Calendar Timezone' : 'Timezone'}
					name="timezone"
					options={TIMEZONE_OPTIONS}
				/>
			</div>

			{isMultiZone && (
				<FormSelect
					label="Right Calendar Timezone"
					name="secondaryTimezone"
					options={TIMEZONE_OPTIONS}
				/>
			)}
		</>
	)
}
