import dayjs, { type Dayjs } from './dayjs'

/**
 * Coerces an optional date-ish value into a Dayjs, or undefined when it is
 * missing or unparseable. Already-Dayjs values pass through untouched.
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

/** Returns a shallow copy of `obj` with the given keys removed. */
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

/**
 * Composes a stable string from parts, for React `key=` props and element ids
 * (e.g. `listKey('day', 3)` -> `'day-3'`).
 */
export const listKey = (...parts: Array<string | number>): string =>
	parts.join('-')
