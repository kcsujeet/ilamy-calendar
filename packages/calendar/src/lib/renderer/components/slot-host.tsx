/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from 'preact/hooks'
import type { SlotMount, SlotMountHandle } from '../../../index'
import type { DomRenderCleanup } from '../types/renderer.types'

interface SlotHostProps<P> {
	slot: SlotMount<P>
	slotKey: string
	context: P
}

/**
 * Renders a stable DOM host for one region slot so external framework trees
 * mount once and update in place without losing state or focus.
 */
export const SlotHost = <P,>({ slot, slotKey, context }: SlotHostProps<P>) => {
	const hostRef = useRef<HTMLDivElement>(null)
	const handleRef = useRef<SlotMountHandle<P> | null>(null)
	const mountedSlotRef = useRef<SlotMount<P> | null>(null)

	useLayoutEffect(() => {
		const host = hostRef.current
		if (!host) return
		if (mountedSlotRef.current === slot && handleRef.current) {
			handleRef.current.update(context)
			return
		}
		handleRef.current?.destroy()
		mountedSlotRef.current = slot
		handleRef.current = slot.mount(host, context)
	}, [slot, context])

	useLayoutEffect(
		() => () => {
			handleRef.current?.destroy()
			handleRef.current = null
			mountedSlotRef.current = null
		},
		[]
	)

	return (
		<div
			data-ilamy-slot-host={slotKey}
			ref={hostRef}
			style={{ display: 'contents' }}
		/>
	)
}

interface LegacyRenderHostProps<P> {
	renderFn: (container: HTMLElement, context: P) => DomRenderCleanup
	context: P
	slotKey: string
	className?: string
	pointerEventsNone?: boolean
}

/** Compatibility bridge for v3 imperative `renderEvent`/`renderHeader`/`renderResource`/`renderEventForm` hooks. */
export const LegacyRenderHost = <P,>({
	renderFn,
	context,
	slotKey,
	className,
	pointerEventsNone = false,
}: LegacyRenderHostProps<P>) => {
	const hostRef = useRef<HTMLDivElement>(null)
	const hadCleanupRef = useRef(false)

	useLayoutEffect(() => {
		const host = hostRef.current
		if (!host) return
		// Imperative DOM callbacks manage raw children directly; managed cleanups
		// (such as React portal bridges) unmount asynchronously via their own cleanup.
		if (!hadCleanupRef.current) {
			host.replaceChildren()
		}
		const cleanup = renderFn(host, context)
		const hasCleanup = typeof cleanup === 'function'
		hadCleanupRef.current = hasCleanup
		return () => {
			if (hasCleanup) {
				cleanup()
			} else {
				host.replaceChildren()
			}
		}
	}, [renderFn, context])

	return (
		<div
			className={className}
			data-ilamy-legacy-host={slotKey}
			ref={hostRef}
			style={
				pointerEventsNone
					? { width: '100%', height: '100%', pointerEvents: 'none' }
					: { width: '100%', height: '100%' }
			}
		/>
	)
}
