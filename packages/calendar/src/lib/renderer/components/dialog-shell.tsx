/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact'
import { useId, useLayoutEffect, useRef } from 'preact/hooks'
import { CloseIcon } from './icons'

interface DialogShellProps {
	open: boolean
	testId: string
	title: string
	subtitle?: string
	maxWidth?: string
	showCloseButton?: boolean
	onClose: () => void
	children: ComponentChildren
}

const openDialogModalSafely = (dialog: HTMLDialogElement) => {
	if (dialog.open) return
	if (typeof dialog.showModal === 'function') {
		try {
			dialog.showModal()
			return
		} catch {
			// Fallback for non-modal test environments (happy-dom)
		}
	}
	dialog.setAttribute('open', 'true')
}

const closeDialogModalSafely = (dialog: HTMLDialogElement) => {
	if (typeof dialog.close === 'function' && dialog.open) {
		try {
			dialog.close()
		} catch {
			// Ignore in happy-dom
		}
	}
	dialog.removeAttribute('open')
}

interface EscapeTrackerState {
	inFlight: boolean
	reachedDialog: boolean
	timer: ReturnType<typeof setTimeout> | null
}

const clearEscapeTimer = (state: EscapeTrackerState) => {
	if (state.timer !== null) {
		clearTimeout(state.timer)
		state.timer = null
	}
}

const resetEscapeAfter = (state: EscapeTrackerState, delayMs: number) => {
	clearEscapeTimer(state)
	state.timer = setTimeout(() => {
		state.inFlight = false
		state.reachedDialog = false
		state.timer = null
	}, delayMs)
}

const attachWindowEscapeTracker = (state: EscapeTrackerState) => {
	const onKeyDown = (evt: KeyboardEvent) => {
		if (evt.key !== 'Escape') return
		state.inFlight = true
		state.reachedDialog = false
		resetEscapeAfter(state, 150)
	}
	const onKeyUp = (evt: KeyboardEvent) => {
		if (evt.key !== 'Escape') return
		resetEscapeAfter(state, 0)
	}
	window.addEventListener('keydown', onKeyDown, true)
	window.addEventListener('keyup', onKeyUp, true)
	return () => {
		window.removeEventListener('keydown', onKeyDown, true)
		window.removeEventListener('keyup', onKeyUp, true)
		clearEscapeTimer(state)
		state.inFlight = false
		state.reachedDialog = false
	}
}

export const DialogShell = ({
	open,
	testId,
	title,
	subtitle,
	maxWidth = '500px',
	showCloseButton = true,
	onClose,
	children,
}: DialogShellProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const returnFocusRef = useRef<HTMLElement | null>(null)
	const escapeStateRef = useRef<EscapeTrackerState>({
		inFlight: false,
		reachedDialog: false,
		timer: null,
	})
	const uid = useId()
	const titleId = `ilamy-dialog-title-${uid}`
	const descId = `ilamy-dialog-desc-${uid}`

	useLayoutEffect(() => {
		const dialog = dialogRef.current
		if (!open || !dialog) return
		const active = document.activeElement
		if (active instanceof HTMLElement && !dialog.contains(active)) {
			returnFocusRef.current = active
		}
		openDialogModalSafely(dialog)
		const detachEscape = attachWindowEscapeTracker(escapeStateRef.current)
		return () => {
			detachEscape()
			closeDialogModalSafely(dialog)
			const prevFocus = returnFocusRef.current
			returnFocusRef.current = null
			if (prevFocus?.isConnected && typeof prevFocus.focus === 'function') {
				prevFocus.focus()
			}
		}
	}, [open])

	if (!open) return null

	return (
		<dialog
			aria-describedby={subtitle ? descId : undefined}
			aria-labelledby={titleId}
			data-ilamy-part="dialog"
			data-testid={testId}
			onCancel={(evt) => {
				evt.preventDefault()
				const state = escapeStateRef.current
				if (state.inFlight && !state.reachedDialog) return
				onClose()
			}}
			onClick={(evt) => {
				if (evt.target === dialogRef.current) onClose()
			}}
			onKeyDown={(evt) => {
				if (evt.key === 'Escape' && !evt.defaultPrevented) {
					escapeStateRef.current.reachedDialog = true
					evt.preventDefault()
					onClose()
				}
			}}
			ref={dialogRef}
			style={{ '--ilamy-dialog-max-w': maxWidth }}
		>
			<div data-ilamy-part="dialog-header">
				<div>
					<h2 data-ilamy-part="dialog-title" id={titleId}>
						{title}
					</h2>
					{subtitle && (
						<p data-ilamy-part="dialog-subtitle" id={descId}>
							{subtitle}
						</p>
					)}
				</div>
				{showCloseButton && (
					<button
						aria-label="Close"
						data-ilamy-part="dialog-close"
						onClick={onClose}
						type="button"
					>
						<CloseIcon />
					</button>
				)}
			</div>
			{children}
		</dialog>
	)
}
