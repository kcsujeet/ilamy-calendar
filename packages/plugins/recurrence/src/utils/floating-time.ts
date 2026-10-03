import type { Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'

/**
 * Converts a Dayjs object to a "Floating Time" Date representation.
 * In Floating Time, we use a UTC Date object but set its UTC components
 * to match the local components of the user's date.
 *
 * This is essential for RRule evaluation because it ensures that a rule
 * like "Every Wednesday" refers to the user's local Wednesday, even if
 * that time falls on a Thursday in actual UTC.
 */
export const toFloatingDate = (d: Dayjs): Date => {
	return new Date(
		Date.UTC(
			d.year(),
			d.month(),
			d.date(),
			d.hour(),
			d.minute(),
			d.second(),
			d.millisecond()
		)
	)
}

/**
 * Converts a "Floating Time" Date back to a Dayjs in the calendar's zone: its
 * UTC components are the wall-clock reading, read in that zone for that date.
 *
 * Read as an offset-less string, which the configured dayjs anchors in the
 * calendar's zone (docs/timezones.md), so the offset is the one in force on
 * that date. Setting the components on `reference` kept the reference's
 * offset, so every occurrence after a daylight-saving change ran an hour off
 * (#307). RFC 5545 §3.8.5.3 keeps instances at "the same local time
 * regardless of time zone changes".
 */
export const fromFloatingDate = (date: Date, reference: Dayjs): Dayjs => {
	const wallClock = date.toISOString().replace('Z', '')
	return dayjs(wallClock).locale(reference.locale())
}
