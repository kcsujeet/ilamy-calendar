import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useLatestHandler } from './use-latest-handler'

type Handler = ((label: string) => string) | undefined

// Renders the hook with `first`, then re-renders with each later handler, and
// returns the function the hook handed back after every render.
const renderLatestHandlerHook = (first: Handler, ...later: Handler[]) => {
	const { result, rerender } = renderHook(
		({ handler }: { handler: Handler }) => useLatestHandler(handler),
		{ initialProps: { handler: first } }
	)
	const returned = [result.current]
	for (const handler of later) {
		rerender({ handler })
		returned.push(result.current)
	}
	return returned
}

describe('useLatestHandler', () => {
	it('keeps one identity while the handler changes, and calls the newest', () => {
		const returned = renderLatestHandlerHook(
			(label) => `first:${label}`,
			(label) => `second:${label}`
		)

		expect(returned.at(1)).toBe(returned.at(0))
		expect(returned.at(0)?.('x')).toBe('second:x')
	})

	it('returns undefined while there is no handler, so fallbacks still run', () => {
		const returned = renderLatestHandlerHook(undefined, (label) => label)

		expect(returned.at(0)).toBeUndefined()
		expect(returned.at(1)?.('x')).toBe('x')
	})
})
