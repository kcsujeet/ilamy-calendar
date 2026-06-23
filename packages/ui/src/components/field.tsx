import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { useMemo } from 'react'

import { cn } from '../lib/utils'
import { Label } from './label'

const fieldVariants = cva(
	'group/field flex w-full gap-3 data-[invalid=true]:text-destructive',
	{
		variants: {
			orientation: {
				vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
				horizontal: [
					'flex-row items-center',
					'[&>[data-slot=field-label]]:flex-auto',
					'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
				],
			},
		},
		defaultVariants: {
			orientation: 'vertical',
		},
	}
)

function Field({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't be laid out
		<div
			className={cn(fieldVariants({ orientation }), className)}
			data-orientation={orientation}
			data-slot="field"
			role="group"
			{...props}
		/>
	)
}

function FieldLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	return (
		<Label
			className={cn(
				'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
				'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4',
				'has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10',
				className
			)}
			data-slot="field-label"
			{...props}
		/>
	)
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<'div'> & {
	errors?: Array<{ message?: string } | undefined>
}) {
	const content = useMemo(() => {
		if (children) {
			return children
		}

		if (!errors?.length) {
			return null
		}

		const uniqueErrors = [
			...new Map(errors.map((error) => [error?.message, error])).values(),
		]

		if (uniqueErrors?.length === 1) {
			return uniqueErrors[0]?.message
		}

		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{uniqueErrors.map((error) =>
					error?.message ? <li key={error.message}>{error.message}</li> : null
				)}
			</ul>
		)
	}, [children, errors])

	if (!content) {
		return null
	}

	return (
		<div
			className={cn('text-sm font-normal text-destructive', className)}
			data-slot="field-error"
			role="alert"
			{...props}
		>
			{content}
		</div>
	)
}

export { Field, FieldError, FieldLabel }
