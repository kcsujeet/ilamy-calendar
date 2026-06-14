import { Input } from '@ilamy/ui/components/input'
import { useController, useFormContext } from 'react-hook-form'

interface FormInputProps {
	name: string
	label: string
	type?: 'text' | 'number'
	placeholder?: string
	min?: number
	max?: number
	// Convert the input's string value to the stored form value (e.g. Number for
	// numeric fields). The default keeps the raw string.
	parse?: (value: string) => unknown
}

// A react-hook-form-bound wrapper around the shadcn Input.
export function FormInput({
	name,
	label,
	type = 'text',
	placeholder,
	min,
	max,
	parse,
}: FormInputProps) {
	const { control } = useFormContext()
	const { field } = useController({ name, control })
	const value = field.value == null ? '' : String(field.value)
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>{label}</span>
			<Input
				max={max}
				min={min}
				onBlur={field.onBlur}
				onChange={(event) =>
					field.onChange(parse ? parse(event.target.value) : event.target.value)
				}
				placeholder={placeholder}
				ref={field.ref}
				type={type}
				value={value}
			/>
		</label>
	)
}
