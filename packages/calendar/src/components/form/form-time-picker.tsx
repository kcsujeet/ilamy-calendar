import { useController } from 'react-hook-form'
import { TimePicker } from '@/components/ui/time-picker'
import type { TimeFormat } from '@/types'
import { FieldWrapper } from './field-wrapper'

interface FormTimePickerProps {
	name: string
	label: string
	/** TimePicker's `name` drives its `time-picker-<name>` test id. */
	testName: string
	minTime?: string
	maxTime?: string
	timeFormat?: TimeFormat
	placeholder?: string
	/** Side-effect run after the field updates (e.g. cross-field sync). */
	onValueChange?: (value: string) => void
}

/**
 * Time picker bound to an `"HH:mm"` string form field. Reads `control` from the
 * surrounding `FormProvider` context.
 */
export function FormTimePicker({
	name,
	label,
	testName,
	minTime,
	maxTime,
	timeFormat,
	placeholder,
	onValueChange,
}: FormTimePickerProps) {
	const { field, fieldState } = useController({ name })
	return (
		<FieldWrapper error={fieldState.error} label={label}>
			<TimePicker
				className="mt-1 h-8 text-sm sm:h-9"
				maxTime={maxTime}
				minTime={minTime}
				name={testName}
				onChange={(value) => {
					field.onChange(value)
					onValueChange?.(value)
				}}
				placeholder={placeholder}
				timeFormat={timeFormat}
				value={field.value}
			/>
		</FieldWrapper>
	)
}
