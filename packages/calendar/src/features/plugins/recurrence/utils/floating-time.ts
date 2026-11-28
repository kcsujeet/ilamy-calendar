import {
	fromFields,
	resolveZone,
	type ZonedDate,
} from '../../../../utils/temporal'

/**
 * Converts a `ZonedDate` to a "Floating Time" `Date` representation: a UTC
 * `Date` whose UTC fields match the wall-clock fields of `d`.
 *
 * Essential for RRule evaluation so rules like "Every Wednesday" refer to the
 * calendar's local Wednesday rather than UTC Wednesday (RFC 5545 §3.3.5).
 */
export const toFloatingDate = (d: ZonedDate): Date =>
	new Date(
		Date.UTC(
			d.year,
			d.month - 1,
			d.day,
			d.hour,
			d.minute,
			d.second,
			d.millisecond
		)
	)

/**
 * Converts a "Floating Time" `Date` back to a `ZonedDate` in `timezone` (or the
 * runtime zone): its UTC fields are read as wall-clock fields in that zone, so
 * every occurrence across a DST transition keeps the same local time with the
 * offset in force on that date (#307, RFC 5545 §3.8.5.3).
 */
export const fromFloatingDate = (date: Date, timezone?: string): ZonedDate =>
	fromFields(
		{
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: date.getUTCHours(),
			minute: date.getUTCMinutes(),
			second: date.getUTCSeconds(),
			millisecond: date.getUTCMilliseconds(),
		},
		resolveZone(timezone)
	)
