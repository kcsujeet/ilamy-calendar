import { Button } from '@ilamy/ui/components/button'
import { useController, useFormContext } from 'react-hook-form'

interface FormButtonGroupOption {
	value: string
	label: string
	// Optional helper text shown under the group when this option is selected.
	description?: string
}

interface FormButtonGroupProps {
	name: string
	label: string
	options: FormButtonGroupOption[]
}

// A react-hook-form-bound segmented control: a row of toggle buttons where the
// selected option is highlighted. Used for small either/or settings.
export function FormButtonGroup({
	name,
	label,
	options,
}: FormButtonGroupProps) {
	const { control } = useFormContext()
	const { field } = useController({ name, control })
	const value = field.value == null ? undefined : String(field.value)
	const selected = options.find((option) => option.value === value)
	return (
		<div className="text-sm text-left font-medium">
			<span>{label}</span>
			<div className="flex gap-1 mt-1">
				{options.map((option) => (
					<Button
						key={option.value}
						onClick={() => field.onChange(option.value)}
						type="button"
						variant={option.value === value ? 'secondary' : 'ghost'}
					>
						{option.label}
					</Button>
				))}
			</div>
			{selected?.description && (
				<p className="text-xs text-muted-foreground font-normal mt-1">
					{selected.description}
				</p>
			)}
		</div>
	)
}
