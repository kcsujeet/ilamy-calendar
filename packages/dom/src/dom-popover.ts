import { createEl } from './dom-styles'

const DEFAULT_POPOVER_WIDTH_PX = 288
const DEFAULT_POPOVER_HEIGHT_PX = 260
const POPOVER_VIEWPORT_MARGIN_PX = 8
const POPOVER_ANCHOR_GAP_PX = 6

/** Copies inline CSS custom properties and color-scheme from a calendar root onto a portaled surface. */
export const copyThemeCssVars = (
	source: HTMLElement,
	target: HTMLElement
): void => {
	const inline = source.style
	for (let i = 0; i < inline.length; i += 1) {
		const prop = inline.item(i)
		if (
			prop.startsWith('--') ||
			prop === 'color-scheme' ||
			prop === 'font-family'
		) {
			target.style.setProperty(prop, inline.getPropertyValue(prop))
		}
	}
}

const positionPopover = (popover: HTMLElement, anchor: HTMLElement): void => {
	const rect = anchor.getBoundingClientRect()
	const popWidth = popover.offsetWidth || DEFAULT_POPOVER_WIDTH_PX
	const popHeight = popover.offsetHeight || DEFAULT_POPOVER_HEIGHT_PX
	const maxLeft = Math.max(
		POPOVER_VIEWPORT_MARGIN_PX,
		window.innerWidth - popWidth - POPOVER_VIEWPORT_MARGIN_PX
	)
	const left = Math.min(
		Math.max(POPOVER_VIEWPORT_MARGIN_PX, rect.left),
		maxLeft
	)
	const spaceBelow =
		window.innerHeight - rect.bottom - POPOVER_VIEWPORT_MARGIN_PX
	const openBelow = spaceBelow >= popHeight || rect.top < popHeight
	let top = Math.max(
		POPOVER_VIEWPORT_MARGIN_PX,
		rect.top - popHeight - POPOVER_ANCHOR_GAP_PX
	)
	if (openBelow) {
		top = rect.bottom + POPOVER_ANCHOR_GAP_PX
	}
	popover.style.left = `${Math.round(left)}px`
	popover.style.top = `${Math.round(top)}px`
}

/** Mounts a viewport-clamped floating popover that dismisses on outside click or Escape. */
export const mountFloatingPopover = (params: {
	host: HTMLElement
	themeSource: HTMLElement
	anchor: HTMLElement
	content: HTMLElement
	onClose?: () => void
}): (() => void) => {
	const popover = createEl(
		'div',
		{
			className:
				'fixed z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none',
			data: { testid: 'dom-date-picker-popover' },
		},
		[params.content]
	)
	copyThemeCssVars(params.themeSource, popover)
	params.host.appendChild(popover)
	positionPopover(popover, params.anchor)

	let closed = false
	const close = () => {
		if (closed) return
		closed = true
		document.removeEventListener('pointerdown', handleOutside, true)
		document.removeEventListener('keydown', handleKeyDown, true)
		window.removeEventListener('resize', handleReposition)
		popover.remove()
		params.onClose?.()
	}

	const handleOutside = (evt: Event) => {
		const target = evt.target
		if (!(target instanceof Node)) return
		if (popover.contains(target) || params.anchor.contains(target)) return
		close()
	}

	const handleKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === 'Escape') {
			evt.preventDefault()
			evt.stopPropagation()
			close()
		}
	}

	const handleReposition = () => positionPopover(popover, params.anchor)

	document.addEventListener('pointerdown', handleOutside, true)
	document.addEventListener('keydown', handleKeyDown, true)
	window.addEventListener('resize', handleReposition)
	return close
}
