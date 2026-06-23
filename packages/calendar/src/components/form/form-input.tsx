import { Input } from '@ilamy/ui/components/input'
import { useController } from 'react-hook-form'
import { FieldWrapper } from './field-wrapper'

interface FormInputProps {
	name: string
	label: string
	placeholder?: string
}

/**
 * Text input bound to a string form field. Reads `control` from the surrounding
 * `FormProvider` context, so it stays form-agnostic (no form-type generic).
 */
export function FormInput({ name, label, placeholder }: FormInputProps) {
	const { field, fieldState } = useController({ name })
	return (
		<FieldWrapper error={fieldState.error} htmlFor={name} label={label}>
			<Input
				aria-invalid={Boolean(fieldState.error)}
				className="h-8 text-sm sm:h-9"
				id={name}
				placeholder={placeholder}
				{...field}
			/>
		</FieldWrapper>
	)
}
