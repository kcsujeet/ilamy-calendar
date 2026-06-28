import { Checkbox } from '@ilamy/ui/components/checkbox'
import { useId } from 'react'
import { useController, useFormContext } from 'react-hook-form'

interface FormCheckboxProps {
	name: string
	label: string
}

// A react-hook-form-bound wrapper around the shadcn Checkbox for a boolean field.
export function FormCheckbox({ name, label }: FormCheckboxProps) {
	const { control } = useFormContext()
	const { field } = useController({ name, control })
	// useId keeps the label/checkbox association unique even when the settings
	// panel is mounted twice (mobile dialog + desktop sidebar).
	const id = useId()
	return (
		<div className="flex items-center space-x-2">
			<Checkbox
				checked={Boolean(field.value)}
				id={id}
				onCheckedChange={(checked) => field.onChange(checked === true)}
			/>
			<label
				className="text-sm font-medium leading-none cursor-pointer ml-2"
				htmlFor={id}
			>
				{label}
			</label>
		</div>
	)
}
