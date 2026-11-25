/** @jsxImportSource preact */

interface IconProps {
	size?: number
	opacity?: number
}

export const ChevronLeftIcon = ({ size = 16 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="m15 18-6-6 6-6" />
	</svg>
)

export const ChevronRightIcon = ({ size = 16 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="m9 18 6-6-6-6" />
	</svg>
)

export const ChevronDownIcon = ({ size = 16, opacity = 0.5 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		style={opacity !== undefined ? { opacity } : undefined}
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="m6 9 6 6 6-6" />
	</svg>
)

export const PlusIcon = ({ size = 16 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="M5 12h14" />
		<path d="M12 5v14" />
	</svg>
)

export const DownloadIcon = ({ size = 16 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<polyline points="7 10 12 15 17 10" />
		<line x1="12" x2="12" y1="15" y2="3" />
	</svg>
)

export const CloseIcon = ({ size = 16 }: IconProps) => (
	<svg
		aria-hidden="true"
		fill="none"
		height={size}
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		viewBox="0 0 24 24"
		width={size}
	>
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	</svg>
)
