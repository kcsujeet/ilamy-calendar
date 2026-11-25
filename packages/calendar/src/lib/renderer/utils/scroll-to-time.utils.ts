/** @jsxImportSource preact */
import type { RefObject } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import {
	applyInitialScrollIfNeeded,
	applyScrollRequestIfNew,
	type ScrollRequest,
	type ScrollToTimeAxis,
} from '../../../utils/scroll-to-time-dom.utils'

export type { ScrollRequest }

interface UseScrollToTimeOptions {
	viewportRef: RefObject<HTMLElement | null>
	scrollTime?: string
	scrollToNow?: boolean
	scrollRequest?: ScrollRequest
	enabled: boolean
	scrollKey: string
	axis?: ScrollToTimeAxis
}

export const useScrollToTime = (opts: UseScrollToTimeOptions): void => {
	const axis = opts.axis ?? 'vertical'
	const scrollToNow = Boolean(opts.scrollToNow)
	const lastScrolledKeyRef = useRef<string | null>(null)
	const lastRequestRef = useRef(opts.scrollRequest)

	useEffect(() => {
		applyInitialScrollIfNeeded({
			viewport: opts.viewportRef.current,
			lastScrolledKeyRef,
			scrollKey: opts.scrollKey,
			scrollTime: opts.scrollTime,
			scrollToNow,
			axis,
			enabled: opts.enabled,
		})
	}, [
		opts.enabled,
		opts.scrollTime,
		scrollToNow,
		opts.scrollKey,
		opts.viewportRef,
		axis,
	])

	useEffect(() => {
		applyScrollRequestIfNew({
			viewport: opts.viewportRef.current,
			lastRequestRef,
			scrollRequest: opts.scrollRequest,
			axis,
			enabled: opts.enabled,
		})
	}, [opts.enabled, opts.scrollRequest, opts.viewportRef, axis])
}
