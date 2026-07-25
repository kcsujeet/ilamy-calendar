import type { OpUnitType as DayjsOpUnitType, PluginFunc } from 'dayjs'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween.js'
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

	/**
	 * Memoised zone offsets.
	 *
	 * The offset lookup below is the single most expensive operation in this
	 * ecosystem: a `format()` plus a full `dayjs.tz()` reparse, measured at ~81us,
	 * paid on EVERY `startOf`/`endOf` once a default timezone is set. Grids call
	 * those per day and per cell, so it dominated every view's cost.
	 *
	 * Keyed on the zone plus the result's WALL-CLOCK minute, not its instant. The
	 * offset is a function of how the wall-clock fields are interpreted in the
	 * zone, and during a transition `result` may still carry a stale offset — the
	 * very case this patch exists to correct — so two results sharing an instant
	 * can legitimately need different answers. Wall-clock keying cannot conflate
	 * them.
	 *
	 * Minute granularity is used because IANA offset transitions land on minute
	 * boundaries, so a bucket can never straddle one. (A coarser bucket, e.g. per
	 * day, would be wrong: the offset changes mid-day on a transition day.)
	 * Day-boundary work only ever produces two distinct wall minutes per day, so
	 * the cache stays small in practice.
	 */
	const offsetCache = new Map<string, number>()
	const OFFSET_CACHE_LIMIT = 4096

	function expectedOffsetFor(result: dayjs.Dayjs, tz: string): number {
		const wallClockMinute = Math.floor(
			(result.valueOf() + result.utcOffset() * 60_000) / 60_000
		)
		const key = `${tz}|${wallClockMinute}`
		const cached = offsetCache.get(key)
		if (cached !== undefined) {
			return cached
		}
		const computed = dayjsFactory
			.tz(result.format('YYYY-MM-DDTHH:mm:ss'), tz)
			.utcOffset()
		// Bounded so a long-lived app cannot grow it without limit. Zone offsets
		// for a given wall minute never change, so dropping everything is safe.
		if (offsetCache.size >= OFFSET_CACHE_LIMIT) {
			offsetCache.clear()
		}
		offsetCache.set(key, computed)
		return computed
	}

	function restoreTimezone(
		instance: dayjs.Dayjs,
		result: dayjs.Dayjs
	): dayjs.Dayjs {
		const tz = (instance as DayjsInternal).$x?.$timezone || defaultTimezone
		if (!tz) return result

		if (result.utcOffset() !== expectedOffsetFor(result, tz)) {
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

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(isBetween)
dayjs.extend(minMax)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(localeData)
dayjs.extend(localizedFormat)
dayjs.extend(fixTimezoneOffset)

// Custom dayjs constructor that automatically uses .tz() for all instances.
// This ensures that dayjs() calls throughout the codebase honor the default
// timezone set via dayjs.tz.setDefault().
const timezoneAwareDayjs = (...args: unknown[]) => {
	return (dayjs as unknown as { tz: (...a: unknown[]) => dayjs.Dayjs }).tz(
		...args
	)
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
 * The constructor forwards its arguments to `dayjs.tz()`, whose second
 * parameter is a TIMEZONE and not a parse format, so `dayjs(input, 'YYYY-MM-DD')`
 * threw `RangeError: invalid time zone` at runtime while type-checking cleanly
 * (see the recurrence date-picker bug). Format parsing would additionally need
 * the CustomParseFormat plugin, which this module deliberately does not extend
 * (https://day.js.org/docs/en/parse/string-format). Offering only the
 * one-argument form turns that mistake into a compile error. To parse in an
 * explicit zone, call `dayjs.tz(input, timezone)`.
 */
type ConfiguredDayjs = ((date?: dayjs.ConfigType) => dayjs.Dayjs) & DayjsStatics

export default timezoneAwareDayjs as unknown as ConfiguredDayjs
