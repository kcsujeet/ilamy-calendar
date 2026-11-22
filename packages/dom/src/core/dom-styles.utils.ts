import {
	type CalendarSlotName,
	formatDate,
	getMonthWeeks,
	now,
	parseDate,
	type StyleRecord,
	type TimeFormat,
	withoutHiddenDays,
	type ZonedDate,
} from '@ilamy/core'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
} from '../dom-calendar.types'

export const translateDom = (
	options: Pick<DomCalendarOptions, 'translations' | 'translator'>,
	key: string,
	fallback: string
): string => {
	if (options.translator) {
		return options.translator(key)
	}
	return options.translations?.[key] ?? fallback
}

export const applyInlineStyle = (
	element: HTMLElement,
	style: StyleRecord | undefined
): void => {
	if (!style) return
	for (const [key, rawValue] of Object.entries(style)) {
		if (rawValue === undefined) continue
		const stringValue = String(rawValue)
		let cssKey = key
		if (!key.startsWith('--')) {
			cssKey = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
		}
		element.style.setProperty(cssKey, stringValue)
	}
}

const GRID_BORDERED_SLOTS = new Set<CalendarSlotName>([
	'dayHeader',
	'resourceHeader',
	'cell',
	'cellToday',
	'cellNonBusiness',
	'cellDisabled',
])

export const applySlot = (
	element: HTMLElement,
	slotName: CalendarSlotName,
	defaultClass: string,
	options: Pick<DomCalendarOptions, 'unstyled' | 'slotProps'>,
	structuralClass = ''
): HTMLElement => {
	element.dataset.slot = slotName
	const slotEntry = options.slotProps?.[slotName]
	let themeBorderClass = ''
	if (
		options.unstyled &&
		options.slotProps?.grid?.style?.border &&
		GRID_BORDERED_SLOTS.has(slotName)
	) {
		themeBorderClass = 'border-r last:border-r-0 border-b border-border'
	}
	const merged = mergeClassNames(
		options.unstyled,
		defaultClass,
		slotEntry?.className,
		themeBorderClass
			? `${structuralClass} ${themeBorderClass}`.trim()
			: structuralClass
	)
	if (merged) {
		element.className = merged
	}
	applyInlineStyle(element, slotEntry?.style)
	if (slotName === 'grid') {
		// `@ilamy/dom` views apply the `grid` slot directly to the scroll container,
		// so a theme's `overflow: hidden` must never disable scrolling.
		if (element.style.overflow === 'hidden') {
			element.style.removeProperty('overflow')
		}
		if (!options.unstyled || options.slotProps?.grid) {
			element.style.scrollbarWidth = 'thin'
			element.style.scrollbarColor =
				'var(--border, rgba(128, 128, 128, 0.35)) transparent'
		}
	}
	return element
}

export const mergeClassNames = (
	unstyled: boolean | undefined,
	defaultClass: string,
	extraClass?: string,
	structuralClass = ''
): string => {
	const parts: string[] = []
	if (structuralClass) {
		parts.push(structuralClass)
	}
	if (!unstyled && defaultClass) {
		parts.push(defaultClass)
	}
	if (extraClass) {
		parts.push(extraClass)
	}
	return parts.join(' ')
}

const applyElementAttributes = (
	node: HTMLElement,
	attrs: Record<string, string | undefined> | undefined,
	data: Record<string, string | undefined> | undefined
): void => {
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			if (value !== undefined) {
				node.setAttribute(key, value)
			}
		}
	}
	if (data) {
		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined) {
				node.dataset[key] = value
			}
		}
	}
}

const appendElementChildren = (
	node: HTMLElement,
	children: Array<Node | string | null | undefined> | undefined
): void => {
	if (!children) return
	for (const child of children) {
		if (child === null || child === undefined) continue
		node.appendChild(
			typeof child === 'string' ? document.createTextNode(child) : child
		)
	}
}

export const createEl = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs?: {
		className?: string
		text?: string
		attrs?: Record<string, string | undefined>
		data?: Record<string, string | undefined>
		style?: StyleRecord
		onClick?: (event: MouseEvent) => void
	},
	children?: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] => {
	const node = document.createElement(tag)
	if (attrs?.className) node.className = attrs.className
	if (attrs?.text !== undefined) node.textContent = attrs.text
	applyElementAttributes(node, attrs?.attrs, attrs?.data)
	applyInlineStyle(node, attrs?.style)
	if (attrs?.onClick) {
		const handler = attrs.onClick
		node.addEventListener('click', (evt) => {
			if (evt instanceof MouseEvent) handler(evt)
		})
	}
	appendElementChildren(node, children)
	return node
}

export const getVisibleMonthWeeks = (
	anchor: ZonedDate,
	firstDayOfWeek: number,
	hiddenDays: Set<number> | undefined
): ZonedDate[][] =>
	getMonthWeeks(anchor, firstDayOfWeek)
		.map((week) => withoutHiddenDays(week, hiddenDays))
		.filter((week) => week.length > 0)

export const resolveCurrentZonedDate = (
	dateIso: string,
	timezone: string
): ZonedDate => parseDate(dateIso, timezone) ?? now(timezone)

export const formatEventTimeRange = (
	event: DomCalendarEvent,
	timezone: string,
	locale: string,
	timeFormat: TimeFormat,
	showEnd: boolean
): string => {
	if (event.allDay) return ''
	const start = parseDate(event.start, timezone)
	if (!start) return ''
	const fmtOptions: Intl.DateTimeFormatOptions = {
		hour: timeFormat === '24-hour' ? '2-digit' : 'numeric',
		minute: '2-digit',
		hour12: timeFormat !== '24-hour',
	}
	const startLabel = formatDate(start, fmtOptions, locale)
	if (!showEnd) return startLabel
	const end = parseDate(event.end, timezone)
	if (!end) return startLabel
	return `${startLabel} – ${formatDate(end, fmtOptions, locale)}`
}

export const createCleanupRegistry = () => {
	const cleanups: Array<() => void> = []
	return {
		add: (fn: () => void) => {
			cleanups.push(fn)
		},
		flush: () => {
			while (cleanups.length > 0) {
				const fn = cleanups.pop()
				fn?.()
			}
		},
	}
}
