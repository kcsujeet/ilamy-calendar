import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useEffect, useRef } from 'react'
import type { EventsFetchInfo } from '@/features/calendar/types'
import { useLatestHandler } from '@/hooks/use-latest-handler'

export type CalendarEventsFetcher = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<CalendarEvent[]>

interface EventsFetcherParams {
	/** The consumer's `events` function, already normalized. Absent for an array. */
	eventsFetcher?: CalendarEventsFetcher
	/** The visible range as the view reports it: `end` is the last instant shown. */
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	timezone?: string
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onEventsError?: (error: unknown) => void
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
}

const doNothing = () => undefined

interface FetchedRange {
	startMs: number
	endMs: number
	timezone?: string
}

/**
 * Loads the events for the visible range when `events` is a function.
 *
 * A fetch starts when nothing was fetched yet, when one is still in flight,
 * when the visible range leaves the last fetched one (or always, with
 * `lazyFetching` off), when the time zone changes, or on `refetchEvents()`.
 * Starting a fetch aborts the one before it, and a result that is not the
 * latest request's is ignored even if the consumer never honoured the signal.
 * A failure keeps the events on screen and does not record the range, so the
 * next navigation retries it.
 *
 * The function is read through `useLatestHandler`: a new identity (an inline
 * function) never refetches by itself.
 */
export const useEventsFetcher = ({
	eventsFetcher,
	getCurrentViewRange,
	timezone,
	lazyFetching = true,
	loading,
	onEventsError,
	setCurrentEvents,
}: EventsFetcherParams): { refetchEvents: () => void } => {
	const fetchEvents = useLatestHandler(eventsFetcher)
	const reportLoading = useLatestHandler(loading)
	const reportError = useLatestHandler(onEventsError)

	const latestRequestId = useRef(0)
	const inFlight = useRef<AbortController | undefined>(undefined)
	const isLoading = useRef(false)
	const lastFetched = useRef<FetchedRange | undefined>(undefined)

	const { start, end } = getCurrentViewRange()
	const rangeStartMs = start.valueOf()
	const rangeEndMs = end.valueOf()

	const setLoading = (next: boolean) => {
		if (isLoading.current !== next) {
			isLoading.current = next
			reportLoading?.(next)
		}
	}

	const fetchVisibleRange = async () => {
		if (!fetchEvents) {
			return
		}
		inFlight.current?.abort()
		const controller = new AbortController()
		inFlight.current = controller
		latestRequestId.current += 1
		const requestId = latestRequestId.current
		const isLatest = () => requestId === latestRequestId.current

		const visible = getCurrentViewRange()
		// The views report the last instant shown; a fetch range ends exclusive.
		const exclusiveEnd = visible.end.add(1, 'millisecond')
		const info: EventsFetchInfo = {
			start: visible.start,
			end: exclusiveEnd,
			startStr: visible.start.toISOString(),
			endStr: exclusiveEnd.toISOString(),
			timezone,
		}

		setLoading(true)
		try {
			const fetched = await fetchEvents(info, { signal: controller.signal })
			if (!isLatest()) {
				return
			}
			inFlight.current = undefined
			if (!Array.isArray(fetched)) {
				throw new TypeError(
					'[@ilamy/calendar] the `events` function must resolve to an array'
				)
			}
			lastFetched.current = {
				startMs: visible.start.valueOf(),
				endMs: visible.end.valueOf(),
				timezone,
			}
			setCurrentEvents(fetched)
			setLoading(false)
		} catch (error) {
			if (!isLatest()) {
				return
			}
			inFlight.current = undefined
			setLoading(false)
			if (reportError) {
				reportError(error)
			} else {
				// biome-ignore lint/suspicious/noConsole: the only place a failed fetch can surface without `onEventsError`
				console.error('[@ilamy/calendar] events fetch failed', error)
			}
		}
	}
	// Stable identity, newest closure: the effect below must run on a range or
	// zone change only, never because a render built a new function.
	const refetchEvents = useLatestHandler(() => {
		void fetchVisibleRange()
	})

	const hasFetcher = Boolean(fetchEvents)
	useEffect(() => {
		if (!hasFetcher) {
			return
		}
		const fetched = lastFetched.current
		const isNeverFetched = fetched === undefined
		const isFetchInFlight = isLoading.current
		const isZoneChanged = fetched?.timezone !== timezone
		const isOutsideFetchedRange =
			fetched !== undefined &&
			(rangeStartMs < fetched.startMs || rangeEndMs > fetched.endMs)
		const mustFetch =
			isNeverFetched ||
			isFetchInFlight ||
			isZoneChanged ||
			isOutsideFetchedRange ||
			!lazyFetching
		if (mustFetch) {
			refetchEvents?.()
		}
	}, [
		hasFetcher,
		rangeStartMs,
		rangeEndMs,
		timezone,
		lazyFetching,
		refetchEvents,
	])

	// Whatever is still in flight when the calendar goes away must not land,
	// and a parent that outlives the calendar must not keep its spinner.
	const stopLoading = useLatestHandler(() => setLoading(false))
	useEffect(
		() => () => {
			latestRequestId.current += 1
			inFlight.current?.abort()
			inFlight.current = undefined
			stopLoading?.()
		},
		[stopLoading]
	)

	return { refetchEvents: refetchEvents ?? doNothing }
}
