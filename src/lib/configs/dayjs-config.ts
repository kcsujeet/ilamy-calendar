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
// Files should use 'import dayjs, { type Dayjs } from "@/lib/configs/dayjs-config"'
export type { Dayjs, ManipulateType, OpUnitType } from 'dayjs'
export default timezoneAwareDayjs as typeof dayjs
