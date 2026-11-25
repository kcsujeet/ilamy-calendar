/** @jsxImportSource preact */
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import type {
	CalendarOwnerState,
	CalendarSlotProps,
	CalendarView,
} from '../../../../index'
import { ChevronDownIcon } from '../../components/icons'
import { rendererKeys } from '../../utils/keys.utils'
import { buildSlotProps } from '../../utils/slot-props.utils'

interface ViewMenuProps {
	views: CalendarView[]
	activeView: CalendarView
	getViewLabel: (view: CalendarView) => string
	slotProps?: CalendarSlotProps
	ownerState: CalendarOwnerState
	onSelectView: (view: CalendarView) => void
}

/** Compact view dropdown shown inside narrow containers (`@container` below 45rem). */
export const ViewMenu = ({
	views,
	activeView,
	getViewLabel,
	slotProps,
	ownerState,
	onSelectView,
}: ViewMenuProps) => {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const btnSlot = buildSlotProps(slotProps, 'navButton', ownerState)

	useLayoutEffect(() => {
		if (!open) return
		const handleKey = (evt: KeyboardEvent) => {
			if (evt.key === 'Escape') {
				evt.preventDefault()
				evt.stopPropagation()
				setOpen(false)
			}
		}
		const handlePointer = (evt: PointerEvent) => {
			const target = evt.target as Node | null
			if (target && !containerRef.current?.contains(target)) {
				setOpen(false)
			}
		}
		document.addEventListener('keydown', handleKey, true)
		document.addEventListener('pointerdown', handlePointer, true)
		return () => {
			document.removeEventListener('keydown', handleKey, true)
			document.removeEventListener('pointerdown', handlePointer, true)
		}
	}, [open])

	return (
		<div data-ilamy-part="view-menu" ref={containerRef}>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				className={btnSlot.className}
				data-ilamy-slot="nav-button"
				data-testid="view-menu-btn"
				onClick={() => setOpen((prev) => !prev)}
				style={btnSlot.style}
				type="button"
			>
				<span>{getViewLabel(activeView)}</span>
				<ChevronDownIcon opacity={0.6} size={14} />
			</button>
			{open && (
				<div data-ilamy-part="view-menu-dropdown" role="menu">
					{views.map((view) => {
						const active = view === activeView
						return (
							<button
								aria-checked={active}
								data-ilamy-part="view-menu-item"
								data-state={active ? 'active' : 'inactive'}
								data-testid={rendererKeys.testId.viewMenuItem(view)}
								key={view}
								onClick={() => {
									onSelectView(view)
									setOpen(false)
								}}
								role="menuitemradio"
								type="button"
							>
								<span>{getViewLabel(view)}</span>
								{active && <span aria-hidden="true">✓</span>}
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
