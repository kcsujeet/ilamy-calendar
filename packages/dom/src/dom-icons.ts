const SVG_NS = 'http://www.w3.org/2000/svg'

export type DomIconName =
	| 'chevron-left'
	| 'chevron-right'
	| 'chevron-down'
	| 'calendar'
	| 'clock'
	| 'download'
	| 'plus'
	| 'x'

const ICON_PATHS: Record<DomIconName, string[]> = {
	'chevron-left': ['m15 18-6-6 6-6'],
	'chevron-right': ['m9 18 6-6-6-6'],
	'chevron-down': ['m6 9 6 6 6-6'],
	calendar: [
		'M8 2v4',
		'M16 2v4',
		'M3 10h18',
		'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
	],
	clock: ['M12 6v6l4 2', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'],
	download: [
		'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
		'm7 10 5 5 5-5',
		'M12 15V3',
	],
	plus: ['M5 12h14', 'M12 5v14'],
	x: ['M18 6 6 18', 'm6 6 12 12'],
}

/** Creates a Lucide-compatible inline SVG icon for the zero-React DOM renderer. */
export const createSvgIcon = (
	name: DomIconName,
	className = 'size-4 shrink-0'
): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, 'svg')
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-width', '2')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')
	svg.setAttribute('aria-hidden', 'true')
	svg.setAttribute('class', className)
	for (const d of ICON_PATHS[name]) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		svg.appendChild(path)
	}
	return svg
}
