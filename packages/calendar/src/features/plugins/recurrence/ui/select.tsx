import type * as React from 'react'
import { cn } from './cn'

type SelectProps = Omit<
	React.SelectHTMLAttributes<HTMLSelectElement>,
	'onChange'
> & {
	value: string
	onValueChange: (value: string) => void
}

/**
 * Minimal native `<select>` wrapper. Pass `<option>` children directly.
 * Backs the recurrence editor without depending on the host design system.
 */
export const Select: React.FC<SelectProps> = ({
	className,
	value,
	onValueChange,
	children,
	...props
}) => {
	return (
		<select
			className={cn(
				'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			onChange={(event) => onValueChange(event.target.value)}
			value={value}
			{...props}
		>
			{children}
		</select>
	)
}
