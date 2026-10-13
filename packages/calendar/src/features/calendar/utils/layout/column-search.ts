/** How many entries of an ascending list are below `value`: the index of the first one at or above it. */
export const countBelow = (ascending: number[], value: number): number => {
	let low = 0
	let high = ascending.length
	while (low < high) {
		const middle = (low + high) >>> 1
		const isBelow = (ascending.at(middle) ?? Number.NaN) < value
		if (isBelow) {
			low = middle + 1
		} else {
			high = middle
		}
	}
	return low
}

/** How many entries of an ascending list are at or below `value`: the index of the first one above it. */
export const countAtOrBelow = (ascending: number[], value: number): number => {
	let low = 0
	let high = ascending.length
	while (low < high) {
		const middle = (low + high) >>> 1
		const isAtOrBelow = (ascending.at(middle) ?? Number.NaN) <= value
		if (isAtOrBelow) {
			low = middle + 1
		} else {
			high = middle
		}
	}
	return low
}
