import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * A function whose identity never changes but which always calls the newest
 * `handler`, for consumer callbacks that run in response to an event rather
 * than during render (`onEventUpdate`, `onCellClick`, …).
 *
 * Consumers commonly pass these inline, so each of their renders hands the
 * calendar a new function. Depending on that identity rebuilt the context
 * value and re-rendered every grid cell, although no cell draws anything from
 * a handler. The ref is written in an insertion effect, which runs before any
 * layout effect, so no event or effect can reach the previous handler after a
 * commit.
 *
 * Returns `undefined` when there is no handler, so `if (onCellClick)`
 * fallbacks keep working: presence still changes the identity, the handler's
 * own identity does not. A call made after the handler was removed returns
 * `undefined`, which the return type says rather than casting away.
 *
 * Not for callbacks a component calls while rendering (`getCellClassName`,
 * `renderEvent`, …): a cell only re-runs those when it re-renders, so keeping
 * their identity stable would leave stale output on screen.
 */
export const useLatestHandler = <Args extends unknown[], Result>(
	handler: ((...args: Args) => Result) | undefined
): ((...args: Args) => Result | undefined) | undefined => {
	const latestHandler = useRef(handler)

	useInsertionEffect(() => {
		latestHandler.current = handler
	})

	const stableHandler = useCallback(
		(...args: Args) => latestHandler.current?.(...args),
		[]
	)

	const hasHandler = handler !== undefined
	return hasHandler ? stableHandler : undefined
}
