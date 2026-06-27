import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { createContext, useContext } from 'react'

import { cn } from '../lib/utils'

// Inlined here (rather than a separate toggle.tsx) since only the group is used.
const toggleVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors outline-none hover:bg-muted hover:text-muted-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer select-none",
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline:
					'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
			},
			size: {
				default: 'h-9 px-2 min-w-9',
				sm: 'h-8 px-2.5 min-w-8',
				lg: 'h-10 px-2.5 min-w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
	size: 'default',
	variant: 'default',
})

function ToggleGroup({
	className,
	variant,
	size,
	children,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
	VariantProps<typeof toggleVariants>) {
	return (
		<ToggleGroupPrimitive.Root
			className={cn('flex items-center justify-center gap-1', className)}
			data-slot="toggle-group"
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	)
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
	VariantProps<typeof toggleVariants>) {
	const context = useContext(ToggleGroupContext)
	return (
		<ToggleGroupPrimitive.Item
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				className
			)}
			data-slot="toggle-group-item"
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	)
}

export { ToggleGroup, ToggleGroupItem }
