import { useEffect, useState } from 'react'
import type { ThemeColorMode } from '../types/settings-form'

const readDocumentDarkMode = (): boolean => {
	if (typeof document === 'undefined') {
		return false
	}
	return document.documentElement.classList.contains('dark')
}

/** Tracks the host document's `.dark` class so `themeMode: 'auto'` stays synced. */
export function useResolvedColorMode(mode: ThemeColorMode): 'light' | 'dark' {
	const [isDocDark, setIsDocDark] = useState(readDocumentDarkMode)

	useEffect(() => {
		if (typeof document === 'undefined') {
			return
		}
		const sync = () => setIsDocDark(readDocumentDarkMode())
		sync()
		const observer = new MutationObserver(sync)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		})
		return () => observer.disconnect()
	}, [])

	if (mode === 'auto') {
		return isDocDark ? 'dark' : 'light'
	}
	return mode
}
