import type { Dayjs } from '@ilamy/calendar'
import { dayjs } from '@ilamy/calendar'

/**
 * Local copies of small core helpers that are not part of the public
 * `@ilamy/calendar` surface. A plugin brings its own utilities rather than
 * reaching into the host's internals. Mirrors `@/lib/utils`'s implementations.
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

export const omitKeys = <T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Omit<T, K> => {
	const result = { ...obj }
	for (const key of keys) {
		delete result[key]
	}
	return result
}
