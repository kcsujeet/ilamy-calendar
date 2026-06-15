import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { useController, useFormContext } from 'react-hook-form'

interface FormSelectOption {
	value: string
	label: string
}

interface FormSelectProps {
	name: string
	label: string
	options: FormSelectOption[]
	placeholder?: string
	disabled?: boolean
	// Convert the Select's string value to the stored form value. Numeric or
	// union-typed fields pass a parser; the default keeps the raw string.
	parse?: (value: string) => unknown
}

// A react-hook-form-bound wrapper around the shadcn Select. Reads/writes the
// field named `name` from the surrounding FormProvider.
export function FormSelect({
	name,
	label,
	options,
	placeholder,
	disabled,
	parse,
}: FormSelectProps) {
	const { control } = useFormContext()
	const { field } = useController({ name, control })
	const value = field.value == null ? undefined : String(field.value)
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>{label}</span>
			<Select
				disabled={disabled}
				onValueChange={(next) => field.onChange(parse ? parse(next) : next)}
				value={value}
			>
				<SelectTrigger className="w-full">
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
		</label>
	)
}
