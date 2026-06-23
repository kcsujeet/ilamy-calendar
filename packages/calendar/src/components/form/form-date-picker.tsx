import { useController } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker'
import { FieldWrapper } from './field-wrapper'

interface FormDatePickerProps {
	name: string
	label: string
	disabledDate?: (date: Date) => boolean
	/** Side-effect run after the field updates (e.g. cross-field sync). */
	onValueChange?: (date: Date) => void
}

/**
 * Date picker bound to a `Date` form field. Reads `control` from the surrounding
 * `FormProvider` context.
 */
export function FormDatePicker({
	name,
	label,
	disabledDate,
	onValueChange,
}: FormDatePickerProps) {
	const { field, fieldState } = useController({ name })
	return (
		<FieldWrapper error={fieldState.error} label={label}>
			<DatePicker
				className="mt-1"
				closeOnSelect
				date={field.value}
				disabled={disabledDate}
				onChange={(date) => {
					if (!date) {
						return
					}
					field.onChange(date)
					onValueChange?.(date)
				}}
			/>
		</FieldWrapper>
	)
}
