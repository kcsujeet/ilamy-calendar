import type * as React from 'react'
import { cn } from './cn'

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export const Label: React.FC<LabelProps> = ({ className, ...props }) => {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is supplied by callers
		<label
			className={cn('text-sm font-medium leading-none select-none', className)}
			{...props}
		/>
	)
}
