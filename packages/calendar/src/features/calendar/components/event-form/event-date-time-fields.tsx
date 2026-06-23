import dayjs from '@ilamy/utils/dayjs'
import { useFormContext, useWatch } from 'react-hook-form'
import { FormCheckbox } from '@/components/form/form-checkbox'
import { FormDatePicker } from '@/components/form/form-date-picker'
import { FormTimePicker } from '@/components/form/form-time-picker'
import { useEffectiveBusinessHours } from '@/features/calendar/hooks/use-effective-business-hours'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { isBusinessDay } from '@/features/calendar/utils/business-hours'
import { getTimeConstraints } from '@/features/calendar/utils/event-form-utils'
import type { EventFormValues } from './event-form-schema'

/**
 * The all-day toggle plus the start/end date and time pickers. Self-contained:
 * it reads the form through `useFormContext` / `useWatch` and the calendar
 * config through context, so the parent passes nothing. Owns the cross-field
 * sync (start <= end, all-day end time) and the business-hours constraints.
 */
export function EventDateTimeFields() {
	const { t, timeFormat } = useSmartCalendarContext((context) => ({
		t: context.t,
		timeFormat: context.timeFormat,
	}))
	const { control, setValue, getValues } = useFormContext<EventFormValues>()

	const isAllDay = useWatch({ control, name: 'isAllDay' })
	const resourceId = useWatch({ control, name: 'resourceId' })
	const startDate = useWatch({ control, name: 'startDate' })
	const endDate = useWatch({ control, name: 'endDate' })

	const businessHours = useEffectiveBusinessHours(resourceId)

	const sameDay = () =>
		dayjs(getValues('startDate')).isSame(dayjs(getValues('endDate')), 'day')

	const keepEndDateAfterStart = (start: Date) => {
		if (dayjs(start).isAfter(dayjs(getValues('endDate')))) {
			setValue('endDate', start)
		}
	}

	const keepStartDateBeforeEnd = (end: Date) => {
		if (dayjs(end).isBefore(dayjs(getValues('startDate')))) {
			setValue('startDate', end)
		}
	}

	const keepEndTimeAfterStart = (start: string) => {
		if (sameDay() && start > getValues('endTime')) {
			setValue('endTime', start)
		}
	}

	const keepStartTimeBeforeEnd = (end: string) => {
		if (sameDay() && end < getValues('startTime')) {
			setValue('startTime', end)
		}
	}

	// All-day events end at the close of the day.
	const handleAllDayChange = (checked: boolean) => {
		if (checked) {
			setValue('endTime', '23:59')
		}
	}

	let disabledDate: ((date: Date) => boolean) | undefined
	if (businessHours) {
		disabledDate = (date) => !isBusinessDay(dayjs(date), businessHours)
	}

	const startConstraints = getTimeConstraints(startDate, businessHours)
	const endConstraints = getTimeConstraints(endDate, businessHours)

	return (
		<>
			<FormCheckbox
				label={t('allDay')}
				name="isAllDay"
				onValueChange={handleAllDayChange}
			/>

			<div className="grid grid-cols-2 gap-2 sm:gap-4">
				<FormDatePicker
					disabledDate={disabledDate}
					label={t('startDate')}
					name="startDate"
					onValueChange={keepEndDateAfterStart}
				/>
				<FormDatePicker
					disabledDate={disabledDate}
					label={t('endDate')}
					name="endDate"
					onValueChange={keepStartDateBeforeEnd}
				/>
			</div>

			{!isAllDay && (
				<div className="grid grid-cols-2 gap-2 sm:gap-4">
					<FormTimePicker
						label={t('startTime')}
						maxTime={startConstraints.max}
						minTime={startConstraints.min}
						name="startTime"
						onValueChange={keepEndTimeAfterStart}
						placeholder={t('searchTime')}
						testName="start-time"
						timeFormat={timeFormat}
					/>
					<FormTimePicker
						label={t('endTime')}
						maxTime={endConstraints.max}
						minTime={endConstraints.min}
						name="endTime"
						onValueChange={keepStartTimeBeforeEnd}
						placeholder={t('searchTime')}
						testName="end-time"
						timeFormat={timeFormat}
					/>
				</div>
			)}
		</>
	)
}
