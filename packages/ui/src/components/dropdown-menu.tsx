import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type * as React from 'react'

import { cn } from '../lib/utils'

function DropdownMenu({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return (
		<DropdownMenuPrimitive.Trigger
			data-slot="dropdown-menu-trigger"
			{...props}
		/>
	)
}

function DropdownMenuContent({
	className,
	sideOffset = 4,
	align = 'end',
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				align={align}
				className={cn(
					'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
					className
				)}
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	)
}

function DropdownMenuItem({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
	return (
		<DropdownMenuPrimitive.Item
			className={cn(
				"focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			data-slot="dropdown-menu-item"
			{...props}
		/>
	)
}

export {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
}
