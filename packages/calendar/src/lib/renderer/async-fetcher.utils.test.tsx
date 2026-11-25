/** @jsxImportSource preact */
import { afterEach, describe, expect, it } from 'bun:test'
import { render } from 'preact'
import { mustFetchRange, useRangeFetcher } from './utils/async-fetcher.utils'

const flushEffects = () =>
	new Promise<void>((resolve) => setTimeout(resolve, 0))

afterEach(() => {
	document.body.innerHTML = ''
})

describe('lib/renderer async-fetcher.utils', () => {
	it('decides lazy vs eager fetching in mustFetchRange', () => {
		const fetched = { startMs: 1000, endMs: 2000, timezone: 'UTC' }
		expect(
			mustFetchRange({
				fetched: undefined,
				visibleStartMs: 1000,
				visibleEndMs: 2000,
				timezone: 'UTC',
				hasAttempted: false,
				isFetchInFlight: false,
				lazyFetching: true,
				followsRange: true,
			})
		).toBe(true)

		// Covered range with lazyFetching skips
		expect(
			mustFetchRange({
				fetched,
				visibleStartMs: 1100,
				visibleEndMs: 1900,
				timezone: 'UTC',
				hasAttempted: true,
				isFetchInFlight: false,
				lazyFetching: true,
				followsRange: true,
			})
		).toBe(false)

		// lazyFetching=false re-fetches even inside range
		expect(
			mustFetchRange({
				fetched,
				visibleStartMs: 1100,
				visibleEndMs: 1900,
				timezone: 'UTC',
				hasAttempted: true,
				isFetchInFlight: false,
				lazyFetching: false,
				followsRange: true,
			})
		).toBe(true)

		// Timezone change invalidates cached range
		expect(
			mustFetchRange({
				fetched,
				visibleStartMs: 1100,
				visibleEndMs: 1900,
				timezone: 'America/New_York',
				hasAttempted: true,
				isFetchInFlight: false,
				lazyFetching: true,
				followsRange: true,
			})
		).toBe(true)
	})

	it('tracks loading state, aborts stale in-flight fetches, and supports manual refetch', async () => {
		const host = document.createElement('div')
		document.body.appendChild(host)

		const loadingStates: boolean[] = []
		const results: string[][] = []
		const abortedSignals: boolean[] = []
		const errors: unknown[] = []
		const resolvers: Array<(rows: Array<{ id: string }>) => void> = []

		let refetchFn: (() => void) | undefined

		const Harness = ({ rangeStart }: { rangeStart: string }) => {
			const { refetch } = useRangeFetcher<{ id: string }>({
				name: 'events',
				fetcher: (_info, { signal }) => {
					const idx = resolvers.length
					signal.addEventListener('abort', () => {
						abortedSignals[idx] = true
					})
					return new Promise((resolve) => {
						resolvers.push(resolve)
					})
				},
				visibleRange: {
					start: rangeStart,
					end: '2026-11-30T23:59:59+00:00',
				},
				timezone: 'UTC',
				loading: (v) => loadingStates.push(v),
				onError: (e) => errors.push(e),
				onResult: (rows) => results.push(rows.map((r) => r.id)),
			})
			refetchFn = refetch
			return <div />
		}

		render(<Harness rangeStart="2026-11-01T00:00:00+00:00" />, host)
		await flushEffects()
		expect(resolvers.length).toBe(1)
		expect(loadingStates).toContain(true)

		// Navigate outside range while first fetch is still in flight -> aborts first
		render(<Harness rangeStart="2026-12-01T00:00:00+00:00" />, host)
		await flushEffects()
		expect(resolvers.length).toBe(2)
		expect(abortedSignals[0]).toBe(true)

		// Stale first resolver resolves later -> ignored
		resolvers[0]?.([{ id: 'stale' }])
		await flushEffects()
		expect(results).toEqual([])

		// Second resolver resolves -> delivered
		resolvers[1]?.([{ id: 'fresh' }])
		await flushEffects()
		expect(results).toEqual([['fresh']])
		expect(loadingStates.at(-1)).toBe(false)

		refetchFn?.()
		await flushEffects()
		expect(resolvers.length).toBe(3)
		resolvers[2]?.([{ id: 'manual' }])
		await flushEffects()
		expect(results).toEqual([['fresh'], ['manual']])
		expect(errors).toEqual([])

		render(null, host)
	})
})
