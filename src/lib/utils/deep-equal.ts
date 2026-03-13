import dayjs from '@/lib/configs/dayjs-config'

/**
 * Performs a recursive deep comparison of two values (primitives, arrays, or plain objects).
 * Specially handles Dayjs instances by comparing their numeric value.
 *
 * @param previous - Previous value to compare
 * @param next - Next value to compare
 * @returns true if the contents are identical, false otherwise
 */
export const isDeepEqual = (previous: unknown, next: unknown): boolean => {
	if (previous === next) return true
	if (
		previous === null ||
		next === null ||
		typeof previous !== 'object' ||
		typeof next !== 'object'
	)
		return false

	// Handle Dayjs instances
	if (dayjs.isDayjs(previous) && dayjs.isDayjs(next)) {
		return previous.valueOf() === next.valueOf()
	}

	// Handle native Date objects
	if (previous instanceof Date && next instanceof Date) {
		return previous.getTime() === next.getTime()
	}

	// Handle Arrays
	if (Array.isArray(previous) && Array.isArray(next)) {
		if (previous.length !== next.length) return false
		return previous.every((val, i) => isDeepEqual(val, next[i]))
	}

	// Handle Plain Objects
	const keysA = Object.keys(previous)
	const keysB = Object.keys(next)
	if (keysA.length !== keysB.length) return false

	return keysA.every((key) => {
		if (!Object.hasOwn(next as object, key)) return false
		return isDeepEqual(
			(previous as Record<string, unknown>)[key],
			(next as Record<string, unknown>)[key]
		)
	})
}
