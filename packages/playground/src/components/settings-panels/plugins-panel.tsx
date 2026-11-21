import { useFormContext, useWatch } from 'react-hook-form'
import type { PlaygroundSettings } from '../../types/settings-form'
import { FormButtonGroup } from '../form/form-button-group'
import { FormCheckbox } from '../form/form-checkbox'
import { FormSelect } from '../form/form-select'
import { SectionHeading } from './settings-fields'
import {
	AGENDA_WINDOW_OPTIONS,
	DAY_MAX_EVENTS_OPTIONS,
	EVENT_HEIGHT_OPTIONS,
	EVENT_SPACING_OPTIONS,
	parseAgendaWindow,
	SCROLL_TIME_OPTIONS,
	type SelectOption,
	SLOT_DURATION_OPTIONS,
	SNAP_DURATION_OPTIONS,
	WEEK_NUMBER_CALCULATION_OPTIONS,
	WEEK_NUMBER_OPTIONS,
} from './settings-options'

interface CheckboxOption {
	name: keyof PlaygroundSettings
	label: string
}

interface GridSelectOption {
	name: keyof PlaygroundSettings
	label: string
	options: SelectOption[]
	numeric?: boolean
}

const EDITING_TOGGLES: CheckboxOption[] = [
	{ name: 'disableDragAndDrop', label: 'Read-only events (editable=false)' },
	{ name: 'eventResizableFromStart', label: 'Resize from start edge' },
	{ name: 'disableCellClick', label: 'Disable cell clicks' },
	{ name: 'disableEventClick', label: 'Disable event clicks' },
]

const DISPLAY_TOGGLES: CheckboxOption[] = [
	{ name: 'nowIndicator', label: 'Show current time line' },
	{ name: 'showEventTimes', label: 'Show event times' },
	{ name: 'showEventEnd', label: 'Show event end times' },
	{ name: 'allDaySlot', label: 'Show all-day row' },
	{ name: 'scrollToNow', label: 'Scroll to now' },
	{ name: 'stickyViewHeader', label: 'Sticky view header' },
]

const DENSITY_SELECTS: GridSelectOption[] = [
	{
		name: 'slotDuration',
		label: 'Slot Duration',
		options: SLOT_DURATION_OPTIONS,
		numeric: true,
	},
	{
		name: 'snapDuration',
		label: 'Snap Duration',
		options: SNAP_DURATION_OPTIONS,
		numeric: true,
	},
	{
		name: 'dayMaxEvents',
		label: 'Max Events/Day',
		options: DAY_MAX_EVENTS_OPTIONS,
		numeric: true,
	},
	{
		name: 'eventHeight',
		label: 'Bar Height',
		options: EVENT_HEIGHT_OPTIONS,
		numeric: true,
	},
	{
		name: 'eventSpacing',
		label: 'Bar Spacing',
		options: EVENT_SPACING_OPTIONS,
		numeric: true,
	},
	{
		name: 'scrollTime',
		label: 'Scroll Time',
		options: SCROLL_TIME_OPTIONS,
	},
]

export function PluginsPanel() {
	const { control } = useFormContext<PlaygroundSettings>()
	const calendarType = useWatch({ control, name: 'calendarType' })
	const enableAgendaPlugin = useWatch({ control, name: 'enableAgendaPlugin' })
	const enableIcalPlugin = useWatch({ control, name: 'enableIcalPlugin' })

	return (
		<>
			<SectionHeading>Opt-In Plugins (v4.0)</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox
					label="Recurrence plugin (RFC 5545 RRULE)"
					name="enableRecurrencePlugin"
				/>
				<FormCheckbox
					label="Drag-to-create plugin"
					name="enableDragToCreatePlugin"
				/>
				<FormCheckbox
					label="Year view plugin (@ilamy/calendar/plugins/year)"
					name="enableYearPlugin"
				/>
				<FormCheckbox
					label="iCal export plugin (VTIMEZONE + TZID)"
					name="enableIcalPlugin"
				/>
				{enableIcalPlugin && (
					<div className="border-l-2 pl-3 ml-1">
						<FormCheckbox
							label="Hide toolbar export button"
							name="hideExportButton"
						/>
					</div>
				)}
				<FormCheckbox label="Agenda view plugin" name="enableAgendaPlugin" />
				{enableAgendaPlugin && calendarType !== 'resource' && (
					<div className="border-l-2 pl-3 ml-1">
						<FormButtonGroup
							label="Agenda Window"
							name="agendaWindow"
							options={AGENDA_WINDOW_OPTIONS}
							parse={parseAgendaWindow}
						/>
					</div>
				)}
			</div>

			<SectionHeading>Editing &amp; Interaction</SectionHeading>
			<div className="space-y-2.5">
				{EDITING_TOGGLES.map((item) => (
					<FormCheckbox key={item.name} label={item.label} name={item.name} />
				))}
			</div>

			<SectionHeading>Display &amp; Grid Density</SectionHeading>
			<div className="space-y-2.5">
				{DISPLAY_TOGGLES.map((item) => (
					<FormCheckbox key={item.name} label={item.label} name={item.name} />
				))}
			</div>

			<div className="grid grid-cols-2 gap-3 pt-1">
				{DENSITY_SELECTS.map((field) => (
					<FormSelect
						key={field.name}
						label={field.label}
						name={field.name}
						options={field.options}
						parse={field.numeric ? Number : undefined}
					/>
				))}
			</div>

			<FormButtonGroup
				label="Week Numbers"
				name="weekNumbers"
				options={WEEK_NUMBER_OPTIONS}
			/>
			<FormButtonGroup
				label="Week Calculation"
				name="weekNumberCalculation"
				options={WEEK_NUMBER_CALCULATION_OPTIONS}
			/>
		</>
	)
}
