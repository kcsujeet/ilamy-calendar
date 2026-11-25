import type {
	CalendarOwnerState,
	CalendarSlotName,
	CalendarSlotProps,
	SlotStyleProps,
	StyleRecord,
} from '../../../index'

export const resolveSlotStyle = (
	slotProps: CalendarSlotProps | undefined,
	slot: CalendarSlotName,
	ownerState: CalendarOwnerState
): SlotStyleProps | undefined => {
	const entry = slotProps?.[slot]
	if (!entry) return undefined
	return typeof entry === 'function' ? entry(ownerState) : entry
}

export const joinClassNames = (
	...parts: Array<string | undefined | false | null>
): string | undefined => {
	const joined = parts
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ')
	return joined || undefined
}

export const mergeStyles = (
	...records: Array<StyleRecord | undefined>
): StyleRecord | undefined => {
	const merged: StyleRecord = {}
	let hasAny = false
	for (const rec of records) {
		if (!rec) continue
		for (const [key, value] of Object.entries(rec)) {
			if (value === undefined) continue
			merged[key] = value
			hasAny = true
		}
	}
	return hasAny ? merged : undefined
}

export const buildSlotProps = (
	slotProps: CalendarSlotProps | undefined,
	slot: CalendarSlotName,
	ownerState: CalendarOwnerState,
	extraClassName?: string,
	baseStyle?: StyleRecord
): { className: string | undefined; style: StyleRecord | undefined } => {
	const resolved = resolveSlotStyle(slotProps, slot, ownerState)
	return {
		className: joinClassNames(resolved?.className, extraClassName),
		style: mergeStyles(baseStyle, resolved?.style),
	}
}
