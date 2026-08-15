import dayjs, { type Dayjs } from './dayjs'

/**
 * Coerces an optional date-ish value into a Dayjs, or undefined when it is
 * missing or unparseable. Already-Dayjs values pass through untouched.
 *
 * Passing through does NOT leak the caller's timezone: the one call site that
 * can hand this a Dayjs is `IlamyCalendar`'s `initialDate`, and the navigation
 * slice re-anchors it in the calendar's zone (see `docs/timezones.md`).
 */
export function safeDate(
	date: Dayjs | Date | string | undefined
): Dayjs | undefined {
	if (date === undefined) {
		return undefined
	}
	if (dayjs.isDayjs(date)) {
		return date
	}
	const parsedDate = dayjs(date)
	return parsedDate.isValid() ? parsedDate : undefined
}

/** Anything with a start and an end: a calendar event, a cell, a selection. */
interface Interval {
	start: Dayjs
	end: Dayjs
}

/**
 * Whether `interval` overlaps `[start, end]`. Covers the three cases: it starts
 * inside the range, it ends inside the range, or it spans the range entirely.
 *
 * An interval's `start` is INCLUSIVE and its `end` EXCLUSIVE, matching RFC 5545
 * ("the DTEND property ... specifies the non-inclusive end of the event") and
 * the Google Calendar API. So one ending at the range's first instant occupies
 * none of it and does not overlap, while one beginning at the range's last
 * instant does. A zero-duration interval is placed by its start, since an end
 * equal to it is behind every instant of the range.
 *
 * This lives in `@ilamy/utils` because the core and two plugins all need the
 * same answer. Three private copies drifted apart once already (#248): the grid
 * showed a one-day event while the agenda showed two.
 */
export function overlapsRange(
	interval: Interval,
	start: Dayjs,
	end: Dayjs
): boolean {
	const startsInRange =
		interval.start.isSameOrAfter(start) && interval.start.isSameOrBefore(end)
	const endsInRange =
		interval.end.isAfter(start) && interval.end.isSameOrBefore(end)
	const spansRange = interval.start.isBefore(start) && interval.end.isAfter(end)
	return startsInRange || endsInRange || spansRange
}

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
