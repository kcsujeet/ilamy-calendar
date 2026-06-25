import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../lib/utils'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const isHex = (value: string | undefined): value is string =>
	Boolean(value && HEX_PATTERN.test(value))

// Derive a readable name from a Tailwind background class (e.g.
// `bg-cyan-100 text-cyan-800` -> `Cyan`), falling back to `Custom`.
const colorNameFromClass = (value: string): string => {
	const name = value.match(/bg-([a-z]+)-\d+/)?.at(1)
	if (!name) {
		return 'Custom'
	}
	return name.charAt(0).toUpperCase() + name.slice(1)
}

interface ColorSwatch {
	/** The value stored when picked: a Tailwind class string (e.g. `bg-blue-100 text-blue-800`) or a hex. */
	value: string
	label: string
}

interface ColorPickerProps {
	/** Current color: a Tailwind class string (from a swatch) or a hex string (from the custom input). */
	value?: string
	onChange: (value: string) => void
	/** Preset swatches rendered with their own className (so Tailwind classes stay theme-aware). */
	swatches?: ColorSwatch[]
	className?: string
	'aria-label'?: string
}

function ColorPicker({
	value,
	onChange,
	swatches = [],
	className,
	'aria-label': ariaLabel = 'Select color',
}: ColorPickerProps) {
	// The hex field is editable while the user types an incomplete value, so it
	// keeps its own state and only propagates once the value is a valid hex.
	const [hexText, setHexText] = useState(isHex(value) ? value : '')
	useEffect(() => {
		setHexText(isHex(value) ? value : '')
	}, [value])

	const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const next = event.target.value
		setHexText(next)
		if (HEX_PATTERN.test(next)) {
			onChange(next)
		}
	}

	const valueIsHex = isHex(value)
	const selectedSwatch = swatches.find((swatch) => swatch.value === value)

	let triggerLabel: string
	if (selectedSwatch) {
		triggerLabel = selectedSwatch.label
	} else if (valueIsHex) {
		triggerLabel = value
	} else if (value) {
		triggerLabel = colorNameFromClass(value)
	} else {
		triggerLabel = 'Pick a color'
	}

	return (
		<Popover>
			<PopoverTrigger
				aria-label={ariaLabel}
				className={cn(
					'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
					className
				)}
				data-slot="color-picker-trigger"
				type="button"
			>
				<span className="flex items-center gap-2">
					<span
						className={cn(
							'size-5 shrink-0 rounded-full border',
							!valueIsHex && value
						)}
						style={valueIsHex ? { backgroundColor: value } : undefined}
					/>
					<span className={cn(valueIsHex && 'font-mono text-xs')}>
						{triggerLabel}
					</span>
				</span>
				<ChevronDownIcon className="size-4 shrink-0 opacity-50" />
			</PopoverTrigger>
			<PopoverContent className="w-56" data-slot="color-picker-content">
				{swatches.length > 0 && (
					<div className="grid grid-cols-7 gap-1.5">
						{swatches.map((swatch) => {
							const isSelected = value === swatch.value
							return (
								<button
									aria-label={swatch.label}
									aria-pressed={isSelected}
									className={cn(
										'focus-visible:ring-ring size-6 cursor-pointer rounded-full border outline-none focus-visible:ring-2',
										swatch.value,
										isSelected && 'ring-ring ring-2 ring-offset-1'
									)}
									key={swatch.value}
									onClick={() => onChange(swatch.value)}
									type="button"
								/>
							)
						})}
					</div>
				)}
				<div className="text-muted-foreground mt-3 mb-1.5 text-xs">Custom</div>
				<div className="flex items-center gap-2">
					<input
						aria-label="Custom color"
						className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
						onChange={(event) => onChange(event.target.value)}
						type="color"
						value={valueIsHex ? value : '#000000'}
					/>
					<Input
						aria-label="Hex color"
						className="font-mono"
						onChange={handleHexChange}
						placeholder="#000000"
						value={hexText}
					/>
				</div>
			</PopoverContent>
		</Popover>
	)
}

export { ColorPicker }
