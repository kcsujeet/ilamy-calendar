import type { Resource } from '@ilamy/types'

/** Whether two objects have the same keys with `===` values: one level deep. */
const isShallowEqual = (
	first: Record<string, unknown> | undefined,
	second: Record<string, unknown> | undefined
): boolean => {
	if (first === second) {
		return true
	}
	if (!first || !second) {
		return false
	}
	const firstKeys = Object.keys(first)
	const hasSameKeyCount = firstKeys.length === Object.keys(second).length
	return (
		hasSameKeyCount &&
		firstKeys.every(
			(key) => Object.hasOwn(second, key) && first[key] === second[key]
		)
	)
}

/**
 * Whether two resources say the same thing. Business hours are compared by
 * value and `data` one level deep (inline object literals are new objects every
 * render); every other field by reference. Objects nested deeper inside `data`
 * count as changed unless they are the same object.
 */
const isSameResource = (first: Resource, second: Resource): boolean => {
	const hasSameBusinessHours =
		JSON.stringify(first.businessHours) === JSON.stringify(second.businessHours)
	return (
		first.id === second.id &&
		first.title === second.title &&
		first.color === second.color &&
		first.backgroundColor === second.backgroundColor &&
		isShallowEqual(first.data, second.data) &&
		hasSameBusinessHours
	)
}

/** Whether two lists hold the same resources in the same order, whatever their identity. */
export const isSameResourceList = (
	first: Resource[],
	second: Resource[]
): boolean => {
	const hasSameLength = first.length === second.length
	return (
		hasSameLength &&
		first.every((resource, index) => {
			const other = second.at(index)
			return other !== undefined && isSameResource(resource, other)
		})
	)
}

/**
 * Whether the calendar is a resource calendar: it has resources, or is loading
 * them, so its layout must not switch when the first list arrives. An empty
 * array is a regular calendar.
 */
export const viewHasResourceAxis = (config: {
	resources?: Resource[]
	hasResourceAxis?: boolean
}): boolean => config.hasResourceAxis ?? Boolean(config.resources?.length)
