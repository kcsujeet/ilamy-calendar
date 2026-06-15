import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
	{
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				destructive:
					'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
				primary:
					'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400 *:data-[slot=alert-description]:text-blue-800 dark:*:data-[slot=alert-description]:text-blue-200',
				secondary:
					'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 [&>svg]:text-gray-600 dark:[&>svg]:text-gray-400 *:data-[slot=alert-description]:text-gray-800 dark:*:data-[slot=alert-description]:text-gray-200',
				success:
					'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400 *:data-[slot=alert-description]:text-green-800 dark:*:data-[slot=alert-description]:text-green-200',
				warning:
					'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400 *:data-[slot=alert-description]:text-yellow-800 dark:*:data-[slot=alert-description]:text-yellow-200',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
)

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
	return (
		<div
			className={cn(alertVariants({ variant }), className)}
			data-slot="alert"
			role="alert"
			{...props}
		/>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
				className
			)}
			data-slot="alert-title"
			{...props}
		/>
	)
}

function AlertDescription({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
				className
			)}
			data-slot="alert-description"
			{...props}
		/>
	)
}

export { Alert, AlertDescription, AlertTitle }
