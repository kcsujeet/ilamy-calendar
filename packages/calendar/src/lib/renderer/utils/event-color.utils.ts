import type { StyleRecord } from '../../../index'
import { readableTextColor } from '../../../utils/helpers'
import type { DomCalendarEvent } from '../types/renderer.types'

const TAILWIND_COLOR_RE = /^(bg|text)-/
const BG_TOKEN_RE = /(?:^|\s)bg-/
const TEXT_TOKEN_RE = /(?:^|\s)text-/
const DARK_TW_BG_RE = /\bbg-(?:black|[a-z]+-(?:600|700|800|900|950))\b/
const LIGHT_TW_BG_RE = /\bbg-(?:white|[a-z]+-(?:50|100|200|300))\b/

const readableTailwindTextColor = (
	bgClass: string
): '#ffffff' | '#000000' | undefined => {
	if (DARK_TW_BG_RE.test(bgClass)) return '#ffffff'
	if (LIGHT_TW_BG_RE.test(bgClass)) return '#000000'
	return undefined
}

const applyAutoTailwindText = (
	bg: string,
	fg: string | undefined,
	style: StyleRecord
) => {
	if (fg || TEXT_TOKEN_RE.test(bg)) return
	const autoColor = readableTailwindTextColor(bg)
	if (autoColor) style.color = autoColor
}

const isTailwindToken = (value: string | undefined): boolean =>
	Boolean(value && TAILWIND_COLOR_RE.test(value.trim()))

const hasBgToken = (value: string | undefined): boolean =>
	Boolean(value && BG_TOKEN_RE.test(value))

export interface ResolvedEventSurface {
	className: string | undefined
	style: StyleRecord | undefined
	hasCustomColor: boolean
}

const applyFallbackBackground = (
	fg: string | undefined,
	_unstyled: boolean,
	hasSlotBg: boolean,
	style: StyleRecord
) => {
	if (hasBgToken(fg) || hasSlotBg || isTailwindToken(fg)) {
		return
	}
	style.backgroundColor = '#dbeafe'
	style.color = fg ?? readableTextColor('#dbeafe')
}

const applyExplicitBackground = (
	bg: string | undefined,
	fg: string | undefined,
	unstyled: boolean,
	hasSlotBg: boolean,
	classes: string[],
	style: StyleRecord
): boolean => {
	if (bg && isTailwindToken(bg)) {
		classes.push(bg.trim())
		applyAutoTailwindText(bg, fg, style)
		return true
	}
	if (bg) {
		style.backgroundColor = bg
		style.color = fg && !isTailwindToken(fg) ? fg : readableTextColor(bg)
		return false
	}
	applyFallbackBackground(fg, unstyled, hasSlotBg, style)
	return false
}

/**
 * Resolves event bar background/foreground colors from `event.backgroundColor` and
 * `event.color` while letting CSS variables / `slotProps.eventBar` govern defaults.
 */
export const resolveEventBarSurface = (
	event: DomCalendarEvent,
	unstyled: boolean,
	hasSlotBg: boolean
): ResolvedEventSurface => {
	if (!event.backgroundColor && !event.color) {
		return { className: undefined, style: undefined, hasCustomColor: hasSlotBg }
	}
	const classes: string[] = []
	const style: StyleRecord = {}
	const bg = event.backgroundColor
	const fg = event.color
	const bgIsToken = applyExplicitBackground(
		bg,
		fg,
		unstyled,
		hasSlotBg,
		classes,
		style
	)
	if (fg && isTailwindToken(fg)) {
		classes.push(fg.trim())
	} else if (fg && (bgIsToken || hasBgToken(fg) || !bg)) {
		style.color = fg
	}
	return {
		className: classes.length > 0 ? classes.join(' ') : undefined,
		style: Object.keys(style).length > 0 ? style : undefined,
		hasCustomColor: true,
	}
}
