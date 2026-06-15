import type { LucideProps } from 'lucide-react'

export const DragDropIcon = (props: LucideProps) => {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			height="24"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			width="24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M14 8a2 2 0 1 0-4 0v4" />
			<path d="M17 8a2 2 0 0 0-2 2v1c0 1.1.9 2 2 2h3v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3h.4c1.9 0 3.6-1.3 3.6-3.2 0-1.3-1-2.4-2.2-2.8" />
			<path d="M7 3H5c-1.1 0-2 .9-2 2" />
			<path d="M9 3h2" />
			<path d="M13 3h6c1.1 0 2 .9 2 2v3" />
		</svg>
	)
}
