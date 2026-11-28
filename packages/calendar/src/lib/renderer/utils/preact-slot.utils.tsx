/** @jsxImportSource preact */
import { type ComponentChildren, render } from 'preact'
import type { SlotMountHandle } from '../../../types/slot.types'

/**
 * Renders a Preact subtree inside `host` wrapped as a framework-agnostic
 * `SlotMountHandle<P>` so plugins and views keep Preact internal to runtime.
 */
export const mountPreactSlot = <P,>(
	host: HTMLElement,
	renderNode: (context: P) => ComponentChildren,
	initialContext: P
): SlotMountHandle<P> => {
	let current = initialContext
	const paint = (ctx: P) => {
		render(renderNode(ctx), host)
	}
	paint(current)
	return {
		update: (next: P) => {
			current = next
			paint(current)
		},
		destroy: () => {
			render(null, host)
		},
	}
}
