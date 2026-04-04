import type { OpUnitType as DayjsOpUnitType, PluginFunc } from 'dayjs'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween.js'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import localeData from 'dayjs/plugin/localeData.js'
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
// When the default tz matches the system tz, dayjs.tz() is pure overhead —
// plain dayjs() already returns the correct local time.
const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
let needsTzWrapper = false

const fixTimezoneOffset: PluginFunc = (_option, dayjsClass, dayjsFactory) => {
	const proto = dayjsClass.prototype

	// Cache offset lookups to avoid expensive dayjs.tz() construction on every call.
	// Key: "YYYY-MM-DDTHH:mm:ss|timezone" → expected UTC offset in minutes.
	const offsetCache = new Map<string, number>()
	const CACHE_MAX_SIZE = 500

	// Intercept setDefault to track the configured timezone and clear caches
	const originalSetDefault = dayjsFactory.tz.setDefault
	dayjsFactory.tz.setDefault = (timezone?: string) => {
		defaultTimezone = timezone
		needsTzWrapper = Boolean(timezone) && timezone !== systemTimezone
		offsetCache.clear()
		cachedNow = undefined
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
		// When tz matches system timezone, dayjs already uses the correct offsets
		if (tz === systemTimezone) return result

		const localTime = result.format('YYYY-MM-DDTHH:mm:ss')
		const cacheKey = `${localTime}|${tz}`
		let expectedOffset = offsetCache.get(cacheKey)
		if (expectedOffset === undefined) {
			expectedOffset = dayjsFactory.tz(localTime, tz).utcOffset()
			if (offsetCache.size >= CACHE_MAX_SIZE) {
				// Evict oldest entries (first quarter of the cache)
				const keysToDelete = [...offsetCache.keys()].slice(
					0,
					CACHE_MAX_SIZE >> 2
				)
				for (const key of keysToDelete) {
					offsetCache.delete(key)
				}
			}
			offsetCache.set(cacheKey, expectedOffset)
		}

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
dayjs.extend(fixTimezoneOffset)

// dayjs.tz() is ~600x slower than dayjs() due to IANA timezone lookups.
// Cache "now" results briefly so dozens of dayjs() calls within a single
// synchronous render frame share one expensive .tz() call.
let cachedNow: dayjs.Dayjs | undefined
let cachedNowTs = 0
const NOW_CACHE_TTL = 50 // ms — well within a single render frame

// dayjs.tz() is ~600x slower than plain dayjs() due to IANA timezone lookups.
// Only use .tz() when the configured timezone differs from the system timezone.
// When they match, plain dayjs() already returns correct local times.
const timezoneAwareDayjs = (...args: unknown[]) => {
	if (!needsTzWrapper) {
		return (dayjs as unknown as (...a: unknown[]) => dayjs.Dayjs)(...args)
	}
	// No-arg call = "now" — cache within a render frame
	if (args.length === 0 || args[0] === undefined) {
		const now = Date.now()
		if (cachedNow && now - cachedNowTs < NOW_CACHE_TTL) {
			return cachedNow
		}
		cachedNow = (
			dayjs as unknown as { tz: (...a: unknown[]) => dayjs.Dayjs }
		).tz()
		cachedNowTs = now
		return cachedNow
	}
	return (dayjs as unknown as { tz: (...a: unknown[]) => dayjs.Dayjs }).tz(
		...args
	)
}

// Attach all static methods and properties from the original dayjs to our wrapper.
// This allows the wrapper to be used as a drop-in replacement.
Object.assign(timezoneAwareDayjs, dayjs)

// Export the Dayjs type separately for use as a type in other files.
// Files should use 'import dayjs, { type Dayjs } from "@/lib/configs/dayjs-config"'
export type { Dayjs, ManipulateType, OpUnitType } from 'dayjs'
export default timezoneAwareDayjs as typeof dayjs
