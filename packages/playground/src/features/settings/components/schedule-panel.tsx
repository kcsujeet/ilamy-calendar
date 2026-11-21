import { useFormContext, useWatch } from 'react-hook-form'
import { FormCheckbox } from '../../../components/form/form-checkbox'
import { FormSelect } from '../../../components/form/form-select'
import type { PlaygroundSettings } from '../../../types/settings-form.types'
import {
	HOUR_OPTIONS,
	SLOT_MAX_TIME_OPTIONS,
	SLOT_MIN_TIME_OPTIONS,
} from '../utils/settings-options.utils'
import { SectionHeading, WeekdayMultiSelectField } from './settings-fields'

const CALLBACK_TOGGLES: { name: keyof PlaygroundSettings; label: string }[] = [
	{
		name: 'useEventLifecycleCallbacks',
		label: 'Live event state (add/update/delete)',
	},
	{
		name: 'useCustomOnDateClick',
		label: 'Alert on cell click (onCellClick)',
	},
	{
		name: 'useCustomOnEventClick',
		label: 'Alert on event click (onEventClick)',
	},
	{
		name: 'useCustomOnMoreEventsClick',
		label: 'Alert on +N more click',
	},
]

export function SchedulePanel() {
	const { control } = useFormContext<PlaygroundSettings>()
	const businessHoursEnabled = useWatch({
		control,
		name: 'enableBusinessHours',
	})

	return (
		<>
			<SectionHeading>Business Hours &amp; Constraints (v4.0)</SectionHeading>
			<p className="text-xs text-muted-foreground leading-relaxed">
				In v4.0, business hours shade closed cells without blocking drops or
				clicks. Opt in to enforcement via constraints below.
			</p>
			<FormCheckbox label="Enable business hours" name="enableBusinessHours" />
			{businessHoursEnabled && (
				<div className="border-l-2 border-primary/25 pl-3 ml-1 space-y-3">
					<WeekdayMultiSelectField
						label="Working Days"
						name="businessHoursDays"
					/>
					<div className="grid grid-cols-2 gap-2">
						<FormSelect
							label="Start"
							name="businessHoursStart"
							options={HOUR_OPTIONS}
							parse={Number}
						/>
						<FormSelect
							label="End"
							name="businessHoursEnd"
							options={HOUR_OPTIONS}
							parse={Number}
						/>
					</div>
					<FormCheckbox
						label="Hide non-business hours"
						name="hideNonBusinessHours"
					/>
					<FormCheckbox
						label="Constrain drops/resizes to business hours"
						name="constrainEventsToBusinessHours"
					/>
					<FormCheckbox
						label="Constrain selection/creation to business hours"
						name="constrainSelectToBusinessHours"
					/>
				</div>
			)}

			<SectionHeading>Visible Hours &amp; Hidden Days</SectionHeading>
			<div className="grid grid-cols-2 gap-2">
				<FormSelect
					label="slotMinTime"
					name="slotMinTime"
					options={SLOT_MIN_TIME_OPTIONS}
				/>
				<FormSelect
					label="slotMaxTime"
					name="slotMaxTime"
					options={SLOT_MAX_TIME_OPTIONS}
				/>
			</div>
			<FormCheckbox label="Show weekends" name="weekends" />
			<WeekdayMultiSelectField label="Hidden Days" name="hiddenDays" />

			<SectionHeading>Callback Demos</SectionHeading>
			<div className="space-y-2.5">
				{CALLBACK_TOGGLES.map((item) => (
					<FormCheckbox key={item.name} label={item.label} name={item.name} />
				))}
			</div>
		</>
	)
}
