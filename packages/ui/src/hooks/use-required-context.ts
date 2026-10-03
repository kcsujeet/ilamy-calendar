import { type Context, useContext } from 'react'

/**
 * Reads a context that has no meaningful default, throwing when the calling
 * component sits outside its provider: a missing provider is a wiring bug, and
 * an `undefined` value would only fail later, further from its cause.
 */
export const useRequiredContext = <T>(
	context: Context<T | undefined>,
	hookName: string,
	providerName: string
): T => {
	const value = useContext(context)

	if (value === undefined) {
		throw new Error(`${hookName} must be used within a ${providerName}`)
	}

	return value
}
