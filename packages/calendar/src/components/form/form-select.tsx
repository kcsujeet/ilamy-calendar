import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { useController } from 'react-hook-form'
import { FieldWrapper } from './field-wrapper'

interface FormSelectOption {
	value: string
	label: string
}

interface FormSelectProps {
	name: string
	label: string
	placeholder?: string
	options: FormSelectOption[]
	testId?: string
	/** Map the chosen option string back to the field's value type (e.g. a numeric id). */
	parseValue?: (value: string) => string | number
}

/**
 * Select bound to a form field. Reads `control` from the surrounding
 * `FormProvider` context. Options carry string values; `parseValue` maps the
 * chosen string back to the field's value type (e.g. a numeric resource id).
 */
export function FormSelect({
	name,
	label,
	placeholder,
	options,
	testId,
	parseValue,
}: FormSelectProps) {
	const { field, fieldState } = useController({ name })
	const value = field.value == null ? undefined : String(field.value)
	return (
		<FieldWrapper error={fieldState.error} htmlFor={name} label={label}>
			<Select
				onValueChange={(next) =>
					field.onChange(parseValue ? parseValue(next) : next)
				}
				value={value}
			>
				<SelectTrigger
					className="h-8 text-sm sm:h-9"
					data-testid={testId}
					id={name}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldWrapper>
	)
}
