/**
 * Composes a stable string from parts, for React `key=` props and element ids
 * (e.g. `listKey('day', 3)` -> `'day-3'`).
 */
export const listKey = (...parts: Array<string | number>): string =>
	parts.join('-')

/**
 * Picks black or white as the most readable text color over a solid hex
 * background. Uses the standard YIQ perceived-brightness formula
 * (https://www.w3.org/TR/AERT/#color-contrast): brightness >= 128 is a light
 * background and gets dark text, otherwise white. Accepts `#rgb` or `#rrggbb`;
 * an unparseable value falls back to dark text.
 */
export function readableTextColor(hex: string): '#000000' | '#ffffff' {
	const normalized = hex.replace('#', '')
	const expanded =
		normalized.length === 3
			? normalized
					.split('')
					.map((channel) => channel + channel)
					.join('')
			: normalized
	if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
		return '#000000'
	}
	const red = Number.parseInt(expanded.slice(0, 2), 16)
	const green = Number.parseInt(expanded.slice(2, 4), 16)
	const blue = Number.parseInt(expanded.slice(4, 6), 16)
	const brightness = (red * 299 + green * 587 + blue * 114) / 1000
	return brightness >= 128 ? '#000000' : '#ffffff'
}

/* ---------------------------------------------------------------------------
 * Slot and snap sizes
 *
 * Shared by the core grids and the drag-to-create plugin, which both narrow an
 * hour-grid cell to the snap-sized piece the pointer is over.
 * ------------------------------------------------------------------------ */

export const MINUTES_PER_HOUR = 60

/** The axis time runs along in an hour grid. */
export type TimeAxis = 'vertical' | 'horizontal'

/**
 * How long an hour-grid cell is: its slot when it has a `minute`, an hour
 * otherwise (a cell of a one-hour row, or a column of a horizontal timeline).
 */
export const getCellMinutes = (
	minute: number | undefined,
	slotDurationMinutes: number | undefined
): number => {
	if (minute === undefined) {
		return MINUTES_PER_HOUR
	}
	return slotDurationMinutes ?? MINUTES_PER_HOUR
}

/**
 * The snap size inside a cell of `cellMinutes`. A snap takes effect only when it
 * is finer than the cell and divides it; otherwise the cell itself is the snap.
 */
export const resolveSnapDuration = (
	snapDuration: number | undefined,
	cellMinutes: number
): number => {
	if (snapDuration === undefined) {
		return cellMinutes
	}
	const isFinerThanCell = snapDuration < cellMinutes
	const dividesCell = cellMinutes % snapDuration === 0
	return isFinerThanCell && dividesCell ? snapDuration : cellMinutes
}

/** Where `at` sits in a span as 0..1, clamped; a span with no length is 0. */
export const getFractionAlong = (
	at: number,
	spanStart: number,
	spanLength: number
): number => {
	if (spanLength <= 0) {
		return 0
	}
	const fraction = (at - spanStart) / spanLength
	return Math.min(1, Math.max(0, fraction))
}

/**
 * Which snap-sized piece of a cell a pointer `fractionIntoCell` along it is
 * over: the piece's `index`, out of `count` pieces.
 */
export const getSnapBucket = (
	fractionIntoCell: number,
	cellMinutes: number,
	snapMinutes: number
): { index: number; count: number } => {
	const count = cellMinutes / snapMinutes
	const lastIndex = count - 1
	const clamped = Math.min(1, Math.max(0, fractionIntoCell))
	const index = Math.min(lastIndex, Math.floor(clamped * count))
	return { index, count }
}
