import { Button } from '@ilamy/ui/components/button'
import { Field, FieldLabel } from '@ilamy/ui/components/field'
import { cn } from '@ilamy/ui/lib/utils'
import { useController } from 'react-hook-form'

interface FormColorOption {
	value: string
	label: string
}

interface FormColorPickerProps {
	name: string
	label: string
	options: FormColorOption[]
}

/**
 * Swatch picker bound to a string form field (the chosen swatch's class value).
 * Reads `control` from the surrounding `FormProvider` context.
 */
export function FormColorPicker({
	name,
	label,
	options,
}: FormColorPickerProps) {
	const { field } = useController({ name })
	return (
		<Field>
			<FieldLabel className="text-xs sm:text-sm">{label}</FieldLabel>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => (
					<Button
						aria-label={option.label}
						className={cn(
							`${option.value} h-6 w-6 rounded-full sm:h-8 sm:w-8`,
							field.value === option.value &&
								'ring-2 ring-black ring-offset-1 sm:ring-offset-2'
						)}
						key={option.value}
						onClick={() => field.onChange(option.value)}
						type="button"
						variant="ghost"
					/>
				))}
			</div>
		</Field>
	)
}
