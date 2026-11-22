import { isBusinessDay } from '@ilamy/core'
import { parseDate } from '@ilamy/utils/temporal'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import type { EventSchedule } from '@/features/event-form/hooks/use-event-schedule'
import { getTimeConstraints } from '@/features/event-form/utils/event-form-schedule.utils'
import type { useEffectiveBusinessHours } from '@/hooks/use-effective-business-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'
import { keys } from '@/utils/keys.utils'

interface ScheduleFieldsProps {
	schedule: EventSchedule
	businessHours: ReturnType<typeof useEffectiveBusinessHours>
	timezone: string
}

interface DateFieldConfig {
	label: 'startDate' | 'endDate'
	name: string
	date: Date
	onChange: (date: Date | undefined) => void
}

interface TimeFieldConfig {
	label: 'startTime' | 'endTime'
	name: string
	value: string
	onChange: (time: string) => void
	constraints: { min: string; max: string }
}

/** Renders the all-day toggle, start/end date pickers, and timed-event time pickers. */
export const ScheduleFields = ({
	schedule,
	businessHours,
	timezone,
}: ScheduleFieldsProps) => {
	const { t, timeFormat } = useSmartCalendarContext((context) => ({
		t: context.t,
		timeFormat: context.timeFormat,
	}))
	const { Checkbox, Label } = useCalendarComponents()
	const {
		startDate,
		endDate,
		isAllDay,
		startTime,
		endTime,
		handleStartDateChange,
		handleEndDateChange,
		handleAllDayChange,
		handleStartTimeChange,
		handleEndTimeChange,
	} = schedule

	let disabledDateMatcher: ((date: Date) => boolean) | undefined
	if (businessHours) {
		disabledDateMatcher = (date) => {
			const zoned = parseDate(date, timezone)
			return Boolean(zoned && !isBusinessDay(zoned, businessHours))
		}
	}

	const startConstraints = getTimeConstraints(
		startDate,
		businessHours,
		timezone
	)
	const endConstraints = getTimeConstraints(endDate, businessHours, timezone)

	const dateFields: DateFieldConfig[] = [
		{
			label: 'startDate',
			name: 'start-date',
			date: startDate,
			onChange: handleStartDateChange,
		},
		{
			label: 'endDate',
			name: 'end-date',
			date: endDate,
			onChange: handleEndDateChange,
		},
	]

	const timeFields: TimeFieldConfig[] = [
		{
			label: 'startTime',
			name: 'start-time',
			value: startTime,
			onChange: handleStartTimeChange,
			constraints: startConstraints,
		},
		{
			label: 'endTime',
			name: 'end-time',
			value: endTime,
			onChange: handleEndTimeChange,
			constraints: endConstraints,
		},
	]

	return (
		<>
			<div className="flex items-center space-x-2">
				<Checkbox
					checked={isAllDay}
					id="allDay"
					onCheckedChange={handleAllDayChange}
				/>
				<Label className="text-xs sm:text-sm" htmlFor="allDay">
					{t('allDay')}
				</Label>
			</div>

			<div className="grid grid-cols-2 gap-2 sm:gap-4">
				{dateFields.map(({ label, name, date, onChange }) => (
					<div key={label}>
						<Label
							className="text-xs sm:text-sm"
							htmlFor={name}
							id={keys.fieldLabel(name)}
						>
							{t(label)}
						</Label>
						<DatePicker
							className="mt-1"
							closeOnSelect
							date={date}
							disabled={disabledDateMatcher}
							id={name}
							labelId={keys.fieldLabel(name)}
							onChange={onChange}
						/>
					</div>
				))}
			</div>

			{!isAllDay && (
				<div className="grid grid-cols-2 gap-2 sm:gap-4">
					{timeFields.map(({ label, name, value, onChange, constraints }) => (
						<div key={label}>
							<Label
								className="text-xs sm:text-sm"
								htmlFor={name}
								id={keys.fieldLabel(name)}
							>
								{t(label)}
							</Label>
							<TimePicker
								className="mt-1 h-8 text-sm sm:h-9"
								id={name}
								labelId={keys.fieldLabel(name)}
								maxTime={constraints.max}
								minTime={constraints.min}
								name={name}
								onChange={onChange}
								timeFormat={timeFormat}
								value={value}
							/>
						</div>
					))}
				</div>
			)}
		</>
	)
}
