import type { Dayjs } from '@ilamy/utils/dayjs'
import { useEffect, useRef } from 'react'
import type { EventsFetchInfo } from '@/features/calendar/types'
import { useLatestHandler } from '@/hooks/use-latest-handler'

export type RangeFetcher<Row> = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<Row[]>

interface RangeFetcherParams<Row> {
	/** Names the data in messages: the consumer's `events` or `resources` function. */
	name: 'events' | 'resources'
	/** The consumer's function, already normalized. Absent for an array. */
	fetcher?: RangeFetcher<Row>
	/**
	 * Whether a change of the visible range refetches. When `false` the data is
	 * fetched once (and again on `refetch()`), whatever the view shows.
	 * @default true
	 */
	followsRange?: boolean
	/** The visible range as the view reports it: `end` is the last instant shown. */
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	timezone?: string
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onError?: (error: unknown) => void
	onResult: (rows: Row[]) => void
}

const doNothing = () => undefined

interface FetchedRange {
	startMs: number
	endMs: number
	timezone?: string
}

interface FetchDecisionInput {
	fetched?: FetchedRange
	visibleStartMs: number
	visibleEndMs: number
	timezone?: string
	/** Whether a fetch ever started, so a failure (no `fetched`) is not "never tried". */
	hasAttempted: boolean
	isFetchInFlight: boolean
	lazyFetching: boolean
	followsRange: boolean
}

/** Whether the range effect must start a fetch now; see `useRangeFetcher` for the rules. */
export const mustFetchRange = ({
	fetched,
	visibleStartMs,
	visibleEndMs,
	timezone,
	hasAttempted,
	isFetchInFlight,
	lazyFetching,
	followsRange,
}: FetchDecisionInput): boolean => {
	if (!fetched) {
		// Data that ignores the range is tried once, and a failure is not retried
		// by navigation: only `refetch()` does. FullCalendar's resource function
		// is likewise called again on a range change only with
		// `refetchResourcesOnNavigate` (@fullcalendar/resource 6.1.22).
		return followsRange || !hasAttempted
	}
	if (!followsRange) {
		return false
	}
	const isZoneChanged = fetched.timezone !== timezone
	const isOutsideFetchedRange =
		visibleStartMs < fetched.startMs || visibleEndMs > fetched.endMs
	return (
		isFetchInFlight || isZoneChanged || isOutsideFetchedRange || !lazyFetching
	)
}

/**
 * Loads the events, or the resources, for the visible range when the prop is
 * a function. One hook serves both so the abort and latest-wins rules exist once.
 *
 * A fetch starts when nothing was fetched yet, when one is still in flight,
 * when the visible range leaves the last fetched one (or always, with
 * `lazyFetching` off), when the time zone changes, or on `refetch()`.
 * Starting a fetch aborts the one before it, and a result that is not the
 * latest request's is ignored even if the consumer never honoured the signal.
 * A failure keeps the events on screen and does not record the range, so the
 * next navigation retries it (range-following data only).
 *
 * The function is read through `useLatestHandler`: a new identity (an inline
 * function) never refetches by itself.
 */
export const useRangeFetcher = <Row>({
	name,
	fetcher,
	followsRange = true,
	getCurrentViewRange,
	timezone,
	lazyFetching = true,
	loading,
	onError,
	onResult,
}: RangeFetcherParams<Row>): { refetch: () => void } => {
	const fetchRows = useLatestHandler(fetcher)
	const reportLoading = useLatestHandler(loading)
	const reportError = useLatestHandler(onError)
	const reportResult = useLatestHandler(onResult)

	const latestRequestId = useRef(0)
	const inFlight = useRef<AbortController | undefined>(undefined)
	const isLoading = useRef(false)
	const lastFetched = useRef<FetchedRange | undefined>(undefined)
	const hasAttempted = useRef(false)

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
		if (!fetchRows) {
			return
		}
		inFlight.current?.abort()
		const controller = new AbortController()
		inFlight.current = controller
		hasAttempted.current = true
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
			const fetched = await fetchRows(info, { signal: controller.signal })
			if (!isLatest()) {
				return
			}
			inFlight.current = undefined
			if (!Array.isArray(fetched)) {
				throw new TypeError(
					`[@ilamy/calendar] the \`${name}\` function must resolve to an array`
				)
			}
			lastFetched.current = {
				startMs: visible.start.valueOf(),
				endMs: visible.end.valueOf(),
				timezone,
			}
			reportResult?.(fetched)
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
				// biome-ignore lint/suspicious/noConsole: the only place a failed fetch can surface without an error handler
				console.error(`[@ilamy/calendar] ${name} fetch failed`, error)
			}
		}
	}
	// Stable identity, newest closure: the effect below must run on a range or
	// zone change only, never because a render built a new function.
	const refetch = useLatestHandler(() => {
		void fetchVisibleRange()
	})

	// Whatever is in flight when the fetcher goes away (the calendar unmounts,
	// or `events` becomes an array) must not land, a parent that outlives it
	// must not keep its spinner, and a fetcher that comes back starts afresh.
	const cancelFetching = useLatestHandler(() => {
		latestRequestId.current += 1
		inFlight.current?.abort()
		inFlight.current = undefined
		lastFetched.current = undefined
		hasAttempted.current = false
		setLoading(false)
	})

	const hasFetcher = Boolean(fetchRows)
	useEffect(() => {
		if (!hasFetcher) {
			cancelFetching?.()
			return
		}
		const mustFetch = mustFetchRange({
			fetched: lastFetched.current,
			visibleStartMs: rangeStartMs,
			visibleEndMs: rangeEndMs,
			timezone,
			hasAttempted: hasAttempted.current,
			isFetchInFlight: isLoading.current,
			lazyFetching,
			followsRange,
		})
		if (mustFetch) {
			refetch?.()
		}
	}, [
		hasFetcher,
		rangeStartMs,
		rangeEndMs,
		timezone,
		lazyFetching,
		followsRange,
		refetch,
		cancelFetching,
	])

	useEffect(
		() => () => {
			cancelFetching?.()
		},
		[cancelFetching]
	)

	return { refetch: refetch ?? doNothing }
}
