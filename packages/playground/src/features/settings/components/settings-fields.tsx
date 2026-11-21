import type { WeekDays } from '@ilamy/calendar'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { useId } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import type { PlaygroundSettings } from '../../../types/settings-form.types'
import {
	optionToInitialDate,
	resolveInitialDateOption,
	WEEKDAY_CHECKBOX_OPTIONS,
} from '../utils/settings-options.utils'

export function SectionHeading({ children }: { children: string }) {
	return (
		<h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 first:pt-0">
			{children}
		</h3>
	)
}

export function InitialDateField() {
	const { control, setValue, getValues } = useFormContext<PlaygroundSettings>()
	const { field } = useController({ name: 'initialDate', control })
	const currentDate: string | undefined = field.value || undefined
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>Initial Date</span>
			<Select
				onValueChange={(option) => {
					field.onChange(optionToInitialDate(option))
					setValue('initialDateRevision', getValues('initialDateRevision') + 1)
				}}
				value={resolveInitialDateOption(currentDate)}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select initial date" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="today">Today</SelectItem>
					<SelectItem value="start-of-month">Month Start</SelectItem>
					<SelectItem value="start-of-year">Year Start</SelectItem>
					<SelectItem value="next-month">Next Month</SelectItem>
					<SelectItem disabled value="custom">
						Custom Date
					</SelectItem>
				</SelectContent>
			</Select>
		</label>
	)
}

export function WeekdayMultiSelectField({
	name,
	label,
}: {
	name: 'businessHoursDays' | 'hiddenDays'
	label: string
}) {
	const { control } = useFormContext<PlaygroundSettings>()
	const { field } = useController({ name, control })
	const idPrefix = useId()
	const selected: WeekDays[] = field.value ?? []

	const toggleDay = (day: WeekDays, checked: boolean) => {
		let next = selected.filter((d) => d !== day)
		if (checked) {
			next = [...selected, day]
		}
		field.onChange(next)
	}

	return (
		<div className="text-sm text-left font-medium">
			<span>{label}</span>
			<div className="grid grid-cols-4 gap-x-2 gap-y-2 mt-1.5">
				{WEEKDAY_CHECKBOX_OPTIONS.map(({ value: day, label: short }) => (
					<div className="flex items-center space-x-1.5" key={day}>
						<Checkbox
							checked={selected.includes(day)}
							id={`${idPrefix}-${day}`}
							onCheckedChange={(checked) => toggleDay(day, checked === true)}
						/>
						<label
							className="text-xs font-normal leading-none cursor-pointer"
							htmlFor={`${idPrefix}-${day}`}
						>
							{short}
						</label>
					</div>
				))}
			</div>
		</div>
	)
}
