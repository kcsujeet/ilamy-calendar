import { type RefObject, useEffect, useRef } from 'react'
import {
	getTimeColumnHours,
	scrollToCurrentTime,
} from '@/components/vertical-grid/scroll-to-current-time'
import type { VerticalGridColProps } from '@/components/vertical-grid/vertical-grid-col'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { CalendarView } from '@/types'

interface UseScrollToCurrentTimeOptions {
	viewportRef: RefObject<HTMLElement | null>
	columns: VerticalGridColProps[]
	gridType?: 'day' | 'hour'
}

// Builds a stable key for when to re-scroll (view, date, visible hour range).
const buildScrollEffectKey = (
	view: CalendarView,
	currentDateLabel: string,
	columns: VerticalGridColProps[]
) => {
	const hours = getTimeColumnHours(columns)
	if (!hours?.length) {
		return ''
	}

	const firstHour = hours[0]
	const lastHour = hours.at(-1) as typeof firstHour
	return `${view}|${currentDateLabel}|${firstHour.hour()}:${firstHour.minute()}-${lastHour.hour()}-${hours.length}`
}

// Scrolls the time grid to the current clock time when day/week hourly views mount or change.
export const useScrollToCurrentTime = ({
	viewportRef,
	columns,
	gridType = 'hour',
}: UseScrollToCurrentTimeOptions) => {
	const { view, currentDate } = useSmartCalendarContext((state) => ({
		view: state.view,
		currentDate: state.currentDate,
	}))
	const columnsRef = useRef(columns)
	columnsRef.current = columns
	const currentDateLabel = currentDate.format('YYYY-MM-DD')
	const scrollEffectKey = buildScrollEffectKey(view, currentDateLabel, columns)

	useEffect(() => {
		if (gridType !== 'hour' || (view !== 'day' && view !== 'week')) {
			return
		}

		if (!scrollEffectKey) {
			return
		}

		const hours = getTimeColumnHours(columnsRef.current)
		if (!hours?.length) {
			return
		}

		const timeouts: number[] = []
		const tryScroll = () => {
			const viewport = viewportRef.current
			if (viewport) {
				scrollToCurrentTime(viewport, hours)
			}
		}

		const frameId = requestAnimationFrame(() => {
			requestAnimationFrame(tryScroll)
		})
		timeouts.push(window.setTimeout(tryScroll, 100))
		timeouts.push(window.setTimeout(tryScroll, 300))

		return () => {
			cancelAnimationFrame(frameId)
			for (const timeoutId of timeouts) {
				window.clearTimeout(timeoutId)
			}
		}
	}, [view, gridType, scrollEffectKey, viewportRef])
}
