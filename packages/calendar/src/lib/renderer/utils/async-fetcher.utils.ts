/** @jsxImportSource preact */
import { useEffect, useRef } from 'preact/hooks'
import { type DateRange, parseDate } from '../../../index'
import {
	abortFetchTracker,
	createFetchTracker,
	executeRangeFetch,
	type FetchTracker,
	mustFetchRange,
	type RangeFetcher,
	resetFetchTracker,
} from '../../../utils/range-fetcher.utils'

export { mustFetchRange }

interface RangeFetcherParams<Row> {
	name: 'events' | 'resources'
	fetcher?: RangeFetcher<Row>
	followsRange?: boolean
	visibleRange: DateRange
	timezone?: string
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onError?: (error: unknown) => void
	onResult: (rows: Row[]) => void
}

export const useRangeFetcher = <Row>({
	name,
	fetcher,
	followsRange = true,
	visibleRange,
	timezone,
	lazyFetching = true,
	loading,
	onError,
	onResult,
}: RangeFetcherParams<Row>): { refetch: () => void } => {
	const trackerRef = useRef<FetchTracker>(createFetchTracker())
	const latestRef = useRef({
		fetcher,
		loading,
		onError,
		onResult,
		visibleRange,
	})
	latestRef.current = { fetcher, loading, onError, onResult, visibleRange }

	const startMs =
		parseDate(visibleRange.start, timezone)?.epochMilliseconds ?? 0
	const endMs = parseDate(visibleRange.end, timezone)?.epochMilliseconds ?? 0

	const runFetch = () => {
		const cur = latestRef.current
		return executeRangeFetch({
			name,
			tracker: trackerRef.current,
			fetchRows: cur.fetcher,
			visible: cur.visibleRange,
			timezone,
			reportLoading: cur.loading,
			reportError: cur.onError,
			reportResult: cur.onResult,
		})
	}

	const refetchRef = useRef(runFetch)
	refetchRef.current = runFetch
	const hasFetcher = Boolean(fetcher)

	useEffect(() => {
		const tracker = trackerRef.current
		if (!hasFetcher) {
			resetFetchTracker(tracker, latestRef.current.loading)
			return
		}
		if (
			mustFetchRange({
				fetched: tracker.lastFetched,
				visibleStartMs: startMs,
				visibleEndMs: endMs,
				timezone,
				hasAttempted: tracker.hasAttempted,
				isFetchInFlight: tracker.isLoading,
				lazyFetching,
				followsRange,
			})
		) {
			void refetchRef.current()
		}
	}, [hasFetcher, startMs, endMs, timezone, lazyFetching, followsRange])

	useEffect(() => () => abortFetchTracker(trackerRef.current), [])

	return {
		refetch: () => {
			void refetchRef.current()
		},
	}
}
