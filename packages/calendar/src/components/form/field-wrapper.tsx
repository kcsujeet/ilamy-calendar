import { Field, FieldError, FieldLabel } from '@ilamy/ui/components/field'
import type { ReactNode } from 'react'

interface FieldWrapperProps {
	label: string
	/** Associates the label with the control; omit for controls without an id. */
	htmlFor?: string
	/** The field's validation error, if any (react-hook-form `fieldState.error`). */
	error?: { message?: string }
	children: ReactNode
}

/**
 * Shared scaffold for a labelled form field: the `Field` wrapper, its `FieldLabel`,
 * the control (`children`), and the `FieldError`. Centralizes the label/error
 * wiring so each `Form*` component only supplies its own control.
 */
export function FieldWrapper({
	label,
	htmlFor,
	error,
	children,
}: FieldWrapperProps) {
	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel className="text-xs sm:text-sm" htmlFor={htmlFor}>
				{label}
			</FieldLabel>
			{children}
			<FieldError errors={error ? [error] : undefined} />
		</Field>
	)
}
