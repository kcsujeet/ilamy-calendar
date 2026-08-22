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

/* ---------------------------------------------------------------------------
 * Calendar-day questions
 *
 * dayjs's own comparators are fine to use directly: `compareByInstant` in
 * `./dayjs` makes the unitless ones answer by epoch millisecond, so
 * `a.isBefore(b)` costs ~10ns even with a `timezone` set. Nothing here
 * duplicates them.
 *
 * A comparison carrying a UNIT is different. `isSame(x, 'day')` still routes
 * through dayjs-timezone's `startOf`, which costs ~101µs, and every grid cell
 * asks that question. Rendered day keys answer it for ~1.5µs.
 * ------------------------------------------------------------------------ */

/** `YYYY-MM-DD` in the configured zone: the stable per-day key. */
export const dayKey = (date: Dayjs): string => date.format('YYYY-MM-DD')

/**
 * Whether two instants fall on the same calendar day.
 *
 * Compares rendered keys rather than epoch millis, because "same day" is a
 * question about a calendar, not about elapsed time: two instants an hour apart
 * can be different days, and 23 hours apart the same one. `format` stays cheap
 * under a timezone (~0.7µs) where `isSame(x, 'day')` does not.
 *
 * Each operand is rendered in ITS OWN zone, so this expects both to share one,
 * which every call site in the calendar does (grid days and `dayjs()` alike
 * come from the configured zone). It is NOT a drop-in for
 * `a.isSame(b, 'day')`, which evaluates the day window in `a`'s zone: for a
 * single instant held as 23:00 in New York and 12:00 the next day in Tokyo,
 * dayjs answers true and this answers false. The tests pin that.
 */
export const isSameDay = (a: Dayjs, b: Dayjs): boolean =>
	dayKey(a) === dayKey(b)

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
 *
 * The three clauses are deliberately NOT collapsed to
 * `start <= rangeEnd && end >= rangeStart`. They disagree on an interval whose
 * end precedes its start, which the tests pin.
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
