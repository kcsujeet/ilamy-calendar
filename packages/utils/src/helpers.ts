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
 * Instant comparison
 *
 * Drop-in replacements for dayjs's `isBefore` / `isAfter` / `isSameOrBefore` /
 * `isSameOrAfter` / `isSame`. The names deliberately mirror dayjs's so a reader
 * already knows what they do; each takes both operands as arguments rather than
 * being a method. Prefer them anywhere the comparison runs in a loop.
 *
 * WHY, since this looks like pointless reinvention:
 *
 * Called with no unit, those dayjs methods compare at millisecond granularity
 * ("default milliseconds", https://day.js.org/docs/en/query/is-before and
 * https://day.js.org/docs/en/query/is-same-or-after), which is exactly what
 * comparing `valueOf()` does. So these give identical answers. What they avoid
 * is the coercion: dayjs passes the other operand through its constructor on
 * every call, and this repo's constructor is timezone-aware (see `./dayjs`),
 * so with the `timezone` prop set that round-trip goes through `dayjs.tz()`.
 *
 * Measured in this repo, `America/New_York` versus no timezone:
 *
 *   .valueOf()            4 ns  ->      5 ns
 *   .isBefore(x)        316 ns  -> 45 178 ns
 *   .isSameOrAfter(x)   794 ns  -> 134 739 ns
 *   .isSame(x, 'day')  5 241 ns -> 91 302 ns
 *
 * `valueOf()` is flat because it just reads the underlying `Date`; the
 * comparators are not. Multiplied by events x days, that difference was the
 * entire cost of a week row (~1.6 s) and of the year view (#245).
 *
 * Two rules follow. Compare instants numerically, and compare calendar DAYS by
 * rendered key (`isSameDay`), never by `isSame(x, 'day')`. Keep dayjs for
 * everything else: parsing, arithmetic, formatting and `startOf`/`endOf` all
 * still need it, because only dayjs knows where the zone's day boundaries are.
 *
 * Two things here do NOT mirror dayjs, both on purpose:
 *   - The unit-ed forms (`isBefore(x, 'month')`) ask a different question and
 *     have no replacement. Leave those calls alone.
 *   - `isBetweenInclusive` is not called `isBetween`, because dayjs's
 *     `isBetween` defaults to '()' and EXCLUDES both ends
 *     (https://day.js.org/docs/en/plugin/is-between). Reusing the name for the
 *     opposite default would be a trap.
 * ------------------------------------------------------------------------ */

/** `a >= b`. */
export const isSameOrAfter = (a: Dayjs, b: Dayjs): boolean =>
	a.valueOf() >= b.valueOf()

/** `a <= b`. */
export const isSameOrBefore = (a: Dayjs, b: Dayjs): boolean =>
	a.valueOf() <= b.valueOf()

/** `a < b`, boundary excluded. */
export const isBefore = (a: Dayjs, b: Dayjs): boolean =>
	a.valueOf() < b.valueOf()

/** `a > b`, boundary excluded. */
export const isAfter = (a: Dayjs, b: Dayjs): boolean =>
	a.valueOf() > b.valueOf()

/** Same millisecond. Mirrors `a.isSame(b)` called with no unit. */
export const isSame = (a: Dayjs, b: Dayjs): boolean =>
	a.valueOf() === b.valueOf()

/** Whether `instant` lies in `[start, end]`: dayjs's `isBetween(..., '[]')`. */
export const isBetweenInclusive = (
	instant: Dayjs,
	start: Dayjs,
	end: Dayjs
): boolean => isSameOrAfter(instant, start) && isSameOrBefore(instant, end)

/** `YYYY-MM-DD` in the configured zone: the stable per-day key. */
export const dayKey = (date: Dayjs): string => date.format('YYYY-MM-DD')

/**
 * Whether two instants fall on the same calendar day in the CONFIGURED zone,
 * i.e. dayjs's `a.isSame(b, 'day')`.
 *
 * Compares rendered keys rather than epoch millis, because "same day" is a
 * question about the zone's calendar, not about elapsed time: two instants an
 * hour apart can be different days, and 23 hours apart the same one. `format`
 * stays cheap under a timezone (~0.7µs) where `isSame(x, 'day')` does not.
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
 * Built on the numeric comparators above rather than dayjs's, which took this
 * predicate from ~458µs to ~17ns with a `timezone` set. Every per-day filter
 * runs it once per event per day, so that was the whole cost of a week row
 * (#245).
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
	const startsInRange = isBetweenInclusive(interval.start, start, end)
	const endsInRange =
		isAfter(interval.end, start) && isSameOrBefore(interval.end, end)
	const spansRange =
		isBefore(interval.start, start) && isAfter(interval.end, end)
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
