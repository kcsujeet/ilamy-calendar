import { Checkbox } from '@ilamy/ui/components/checkbox'
import { Field, FieldLabel } from '@ilamy/ui/components/field'
import { useController } from 'react-hook-form'

interface FormCheckboxProps {
	name: string
	label: string
	/** Side-effect run after the field updates (e.g. cross-field sync). */
	onValueChange?: (checked: boolean) => void
}

/**
 * Checkbox bound to a boolean form field. Reads `control` from the surrounding
 * `FormProvider` context.
 */
export function FormCheckbox({
	name,
	label,
	onValueChange,
}: FormCheckboxProps) {
	const { field } = useController({ name })
	return (
		<Field orientation="horizontal">
			<Checkbox
				checked={field.value}
				id={name}
				onCheckedChange={(checked) => {
					const isChecked = checked === true
					field.onChange(isChecked)
					onValueChange?.(isChecked)
				}}
			/>
			<FieldLabel className="text-xs sm:text-sm" htmlFor={name}>
				{label}
			</FieldLabel>
		</Field>
	)
}
