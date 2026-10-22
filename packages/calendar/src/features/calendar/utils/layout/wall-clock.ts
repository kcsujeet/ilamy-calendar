import type { Dayjs } from '@ilamy/utils/dayjs'

export const MS_PER_HOUR = 3_600_000

const MS_PER_MINUTE = 60_000

/**
 * A date's wall-clock reading as milliseconds: the fields a clock in its zone
 * shows, with no offset left to change. The same reading as `wallClockDiff`
 * (`@ilamy/utils/helpers`), without building a Dayjs to measure it.
 */
export const wallClockMs = (date: Dayjs): number =>
	date.valueOf() + date.utcOffset() * MS_PER_MINUTE
