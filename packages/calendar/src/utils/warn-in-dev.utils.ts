/**
 * Console warning for a misused prop, silent in production builds.
 *
 * Guarded `typeof process` check: the published bundle ships this line as-is
 * (no build-time env replacement), so bundler-less ESM consumers must not
 * crash on a bare `process` reference.
 */
export const warnInDev = (message: string) => {
	const isDevBuild =
		typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
	if (isDevBuild) {
		// biome-ignore lint/suspicious/noConsole: deliberate DX guard (view contract)
		console.warn(message)
	}
}
