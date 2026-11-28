import type { Resource } from '../types/calendar.types'

const isShallowEqualRecord = (
	first: Record<string, unknown> | undefined,
	second: Record<string, unknown> | undefined
): boolean => {
	if (first === second) return true
	if (!first || !second) return false
	const firstKeys = Object.keys(first)
	if (firstKeys.length !== Object.keys(second).length) return false
	return firstKeys.every(
		(key) => Object.hasOwn(second, key) && first[key] === second[key]
	)
}

const isSameResource = (first: Resource, second: Resource): boolean =>
	first.id === second.id &&
	first.title === second.title &&
	first.color === second.color &&
	first.backgroundColor === second.backgroundColor &&
	isShallowEqualRecord(first.data, second.data) &&
	JSON.stringify(first.businessHours) === JSON.stringify(second.businessHours)

/** Returns true when two resource lists have identical resources in the same order. */
export const isSameResourceList = (
	first: Resource[],
	second: Resource[]
): boolean =>
	first.length === second.length &&
	first.every((resource, index) => {
		const other = second.at(index)
		return other !== undefined && isSameResource(resource, other)
	})
