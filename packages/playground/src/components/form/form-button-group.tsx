import { Button } from '@ilamy/ui/components/button'
import { ButtonGroup } from '@ilamy/ui/components/button-group'
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
	// Convert the button's string value to the stored form value. Numeric or
	// union-typed fields pass a parser; the default keeps the raw string.
	parse?: (value: string) => unknown
}

// A react-hook-form-bound segmented control built on the @ilamy/ui ButtonGroup:
// a connected row of buttons where the selected option is filled. Used for small
// either/or settings.
export function FormButtonGroup({
	name,
	label,
	options,
	parse,
}: FormButtonGroupProps) {
	const { control } = useFormContext()
	const { field } = useController({ name, control })
	const value = field.value == null ? undefined : String(field.value)
	const selected = options.find((option) => option.value === value)
	return (
		<div className="text-sm text-left font-medium">
			<span>{label}</span>
			<ButtonGroup className="mt-1 w-full">
				{options.map((option) => (
					<Button
						className="flex-1 px-2"
						key={option.value}
						onClick={() =>
							field.onChange(parse ? parse(option.value) : option.value)
						}
						size="sm"
						type="button"
						variant={option.value === value ? 'default' : 'outline'}
					>
						{option.label}
					</Button>
				))}
			</ButtonGroup>
			{selected?.description && (
				<p className="text-xs text-muted-foreground font-normal mt-1">
					{selected.description}
				</p>
			)}
		</div>
	)
}
