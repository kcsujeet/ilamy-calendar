import type { Dayjs } from '@ilamy/calendar'

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
 * Converts a "Floating Time" Date back to a Dayjs object in the original context.
 * It takes the YMDHMS components from the UTC Date and applies them to the
 * reference Dayjs object (preserving its timezone/locale).
 */
export const fromFloatingDate = (date: Date, reference: Dayjs): Dayjs => {
	return reference
		.year(date.getUTCFullYear())
		.month(date.getUTCMonth())
		.date(date.getUTCDate())
		.hour(date.getUTCHours())
		.minute(date.getUTCMinutes())
		.second(date.getUTCSeconds())
		.millisecond(date.getUTCMilliseconds())
}
