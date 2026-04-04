import { useRef } from 'react'
import type { Dayjs } from '@/lib/configs/dayjs-config'

/**
 * Stabilize a Dayjs[] array by reference: return the previous array if the
 * timestamps are identical. This avoids busting downstream useMemo deps when
 * the parent creates a structurally-equal array on every render.
 */
export function useStableDays(days: Dayjs[]): Dayjs[] {
	const ref = useRef(days)
	const prevKey = ref.current.map((d) => d.valueOf()).join(',')
	const nextKey = days.map((d) => d.valueOf()).join(',')
	if (prevKey !== nextKey) {
		ref.current = days
	}
	return ref.current
}
