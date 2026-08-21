import type { OpUnitType as DayjsOpUnitType, PluginFunc } from 'dayjs'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import localeData from 'dayjs/plugin/localeData.js'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import minMax from 'dayjs/plugin/minMax.js'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import weekday from 'dayjs/plugin/weekday.js'
import weekOfYear from 'dayjs/plugin/weekOfYear.js'

/**
 * Plugin that fixes a dayjs-timezone bug where .startOf() and .endOf() drop
 * timezone info when the system's local timezone has a DST transition near
 * the target date. After each startOf/endOf call, if the UTC offset has
 * drifted from what the timezone expects, re-apply the timezone with
 * keepLocalTime=true to restore the correct offset.
 */
interface DayjsInternal extends dayjs.Dayjs {
	$x: { $timezone?: string }
}

let defaultTimezone: string | undefined

const fixTimezoneOffset: PluginFunc = (_option, dayjsClass, dayjsFactory) => {
	const proto = dayjsClass.prototype

	// Intercept setDefault to track the configured timezone
	const originalSetDefault = dayjsFactory.tz.setDefault
	dayjsFactory.tz.setDefault = (timezone?: string) => {
		defaultTimezone = timezone
		return originalSetDefault(timezone)
	}

	type StartOfFn = (unit: DayjsOpUnitType, _startOf?: boolean) => dayjs.Dayjs
	const originalStartOf = proto.startOf as StartOfFn
	const originalEndOf = proto.endOf

	function restoreTimezone(
		instance: dayjs.Dayjs,
		result: dayjs.Dayjs
	): dayjs.Dayjs {
		const tz = (instance as DayjsInternal).$x?.$timezone || defaultTimezone
		if (!tz) return result

		const expectedOffset = dayjsFactory
			.tz(result.format('YYYY-MM-DDTHH:mm:ss'), tz)
			.utcOffset()
		if (result.utcOffset() !== expectedOffset) {
			return result.tz(tz, true)
		}
		return result
	}

	// dayjs's endOf calls startOf(unit, false) internally — the second arg
	// (_startOf) controls start-vs-end behavior. We must forward it.
	proto.startOf = function (unit: DayjsOpUnitType, _startOf?: boolean) {
		const result = originalStartOf.call(this, unit, _startOf)
		return restoreTimezone(this, result)
	}

	// endOf delegates to startOf(unit, false), so the patched startOf handles it
	proto.endOf = originalEndOf
}

/**
 * Makes unitless comparison answer by INSTANT, which is what dayjs documents it
 * to be ("default milliseconds": https://day.js.org/docs/en/query/is-before,
 * .../is-same, .../is-same-or-after) and what upstream does not deliver for
 * timezone-aware instances.
 *
 * Every comparator routes through `startOf` (`isBefore` -> `endOf(units)`;
 * `isSame` -> both `startOf` and `endOf`; `isSameOrAfter` = `isSame || isAfter`,
 * so up to three). dayjs-timezone overrides `startOf` with a
 * format -> reparse -> `.tz(zone, true)` round-trip that runs even for the no-op
 * `startOf(undefined)`. Two consequences, both fixed here:
 *
 *   - Correctness. The re-anchor MOVES an instance whose UTC offset is stale,
 *     which `add()` produces across a DST transition. Two instants an hour apart
 *     then compared equal. Reported upstream as dayjs#1399 (open since 2021).
 *   - Cost. 45µs to 135µs per comparison against ~12ns here, multiplied by
 *     events x days on every per-day filter (#245). Reported upstream as
 *     dayjs#2344 (open since 2023).
 *
 * The fast path applies ONLY when no unit is given and the operand is already a
 * Dayjs. A unit asks a different question (`isSame(x, 'day')` compares calendar
 * days), and any other operand needs dayjs's own coercion; both fall through to
 * the original implementation untouched.
 */
const compareByInstant: PluginFunc = (_option, dayjsClass) => {
	const proto = dayjsClass.prototype as unknown as Record<string, unknown>
	const comparisons = {
		isBefore: (a: number, b: number) => a < b,
		isAfter: (a: number, b: number) => a > b,
		isSame: (a: number, b: number) => a === b,
		isSameOrBefore: (a: number, b: number) => a <= b,
		isSameOrAfter: (a: number, b: number) => a >= b,
	}

	for (const [methodName, compare] of Object.entries(comparisons)) {
		const originalMethod = proto[methodName] as (
			that?: dayjs.ConfigType,
			units?: DayjsOpUnitType
		) => boolean

		proto[methodName] = function (
			this: dayjs.Dayjs,
			that?: dayjs.ConfigType,
			units?: DayjsOpUnitType
		): boolean {
			const isInstantComparison = units === undefined && dayjs.isDayjs(that)
			if (isInstantComparison) {
				return compare(this.valueOf(), that.valueOf())
			}
			return originalMethod.call(this, that, units)
		}
	}
}

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(minMax)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(localeData)
dayjs.extend(localizedFormat)
dayjs.extend(fixTimezoneOffset)
// Last: it wraps the comparator methods the plugins above install.
dayjs.extend(compareByInstant)

/**
 * The suffixes dayjs accepts as an explicit UTC offset. dayjs's own parse regex
 * has no offset group, so these strings fall through to the native `Date`
 * parser, which reads `Z`, `±HH:MM` and `±HHMM` (a bare `±HH` is rejected as
 * invalid). Matched against the TIME half of the value only, so the hyphens in
 * `2026-03-02` cannot be mistaken for one.
 */
const EXPLICIT_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i

const hasExplicitOffset = (value: string): boolean => {
	const timePart = value.split(/[Tt\s]/).at(1)
	if (!timePart) {
		return false
	}
	return EXPLICIT_OFFSET.test(timePart)
}

/**
 * Custom dayjs constructor that resolves every input in the timezone set via
 * `dayjs.tz.setDefault()`, so `dayjs()` calls throughout the codebase honor the
 * calendar's zone, and in the machine's zone when the calendar has none.
 *
 * Which zone anchors a STRING depends on whether it carries its own offset,
 * because the two kinds of string mean different things:
 *
 * - `'2026-08-17T22:00:00.000Z'` already names an instant. It keeps that instant
 *   and merely renders in the calendar's zone. Handing it to `dayjs.tz()` would
 *   read the clock face and discard the offset
 *   (https://day.js.org/docs/en/plugin/timezone), which in Europe/Vienna turned
 *   this value into 2026-08-17T22:00+02:00: a different instant, on a different
 *   day, so an all-day event showed up twice (#247).
 * - `'2026-03-02'` names a wall-clock reading with no instant of its own, so the
 *   calendar's zone is what anchors it. Letting dayjs read it locally instead
 *   would put the same calendar on a different instant for every user.
 *
 * Both rules say the same thing: the machine's zone never decides anything the
 * `timezone` prop can decide.
 */
const timezoneAwareDayjs = (input?: dayjs.ConfigType) => {
	const instant = dayjs(input)
	// `dayjs.tz()` throws `RangeError: date value is not finite` on an
	// unparseable value rather than returning an invalid instance, so it must
	// never see one. Callers guard with `.isValid()` (see `safeDate`).
	if (!instant.isValid()) {
		return instant
	}
	const isWallClockReading =
		typeof input === 'string' && !hasExplicitOffset(input)
	if (isWallClockReading) {
		return dayjs.tz(input)
	}
	if (!defaultTimezone) {
		return instant
	}
	return instant.tz(defaultTimezone)
}

// Attach all static methods and properties from the original dayjs to our wrapper.
// This allows the wrapper to be used as a drop-in replacement.
Object.assign(timezoneAwareDayjs, dayjs)

// Export the Dayjs type separately for use as a type in other files.
// Files should use 'import dayjs, { type Dayjs } from "@ilamy/utils/dayjs"'
export type Dayjs = dayjs.Dayjs
export type ManipulateType = dayjs.ManipulateType

/**
 * dayjs's statics without its call signatures. Mapping over the keys drops the
 * call signatures, which is what lets the exported type re-advertise only the
 * single-argument constructor.
 */
type DayjsStatics = { [K in keyof typeof dayjs]: (typeof dayjs)[K] }

/**
 * The configured dayjs: a one-argument constructor plus every dayjs static.
 *
 * The constructor takes the input and nothing else. It used to forward every
 * argument to `dayjs.tz()`, whose second parameter is a TIMEZONE and not a parse
 * format, so `dayjs(input, 'YYYY-MM-DD')` threw `RangeError: invalid time zone`
 * at runtime while type-checking cleanly (see the recurrence date-picker bug).
 * A second argument is now ignored rather than misread, and the one-argument type
 * keeps it a compile error either way. Format parsing would additionally need the
 * CustomParseFormat plugin, which this module deliberately does not extend
 * (https://day.js.org/docs/en/parse/string-format). To read a bare wall-clock
 * string as a time in a given zone, call `dayjs.tz(input, timezone)`.
 */
type ConfiguredDayjs = ((date?: dayjs.ConfigType) => dayjs.Dayjs) & DayjsStatics

export default timezoneAwareDayjs as unknown as ConfiguredDayjs
