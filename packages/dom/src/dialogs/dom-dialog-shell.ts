import { createSvgIcon } from '../core/dom-icons.utils'
import { copyThemeCssVars } from '../core/dom-popover.utils'
import { createEl } from '../core/dom-styles.utils'
import type { DomRuntime } from '../dom-calendar.types'

export const INPUT_CLASS =
	'w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export const TEXTAREA_CLASS =
	'w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const LABEL_CLASS = 'block text-sm font-medium text-foreground mb-1.5'

/** Opens a native `<dialog>` safely with fallback for non-modal test environments. */
export const openDialogSafely = (dialog: HTMLDialogElement): void => {
	if (typeof dialog.showModal === 'function') {
		try {
			dialog.showModal()
			return
		} catch {
			// Fallback in happy-dom / non-modal contexts
		}
	}
	dialog.setAttribute('open', 'true')
}

let nextDialogId = 0

/** Creates a themed `<dialog>` shell wired for Escape, backdrop click, and cleanup. */
export const createManagedDialog = (
	runtime: DomRuntime,
	testId: string,
	maxWidthClass = 'max-w-[500px]',
	onCleanup?: () => void
): { dialog: HTMLDialogElement; close: () => void } => {
	const dialog = document.createElement('dialog')
	dialog.dataset.testid = testId
	dialog.className = `fixed inset-0 m-auto hidden open:flex flex-col max-h-[90vh] w-[90vw] ${maxWidthClass} rounded-lg border border-border bg-background p-4 sm:p-6 text-foreground shadow-lg overflow-hidden backdrop:bg-black/50`
	dialog.style.overscrollBehavior = 'contain'
	copyThemeCssVars(runtime.root, dialog)

	const close = () => {
		onCleanup?.()
		if (typeof dialog.close === 'function' && dialog.open) dialog.close()
		dialog.remove()
	}
	dialog.addEventListener('close', () => {
		onCleanup?.()
		dialog.remove()
	})
	dialog.addEventListener('click', (evt) => {
		if (evt.target === dialog) close()
	})
	return { dialog, close }
}

export const createDialogHeader = (
	title: string,
	subtitle: string | undefined,
	onClose: () => void,
	dialog?: HTMLDialogElement
): HTMLElement => {
	nextDialogId += 1
	const titleId = `ilamy-dialog-title-${nextDialogId}`
	const descriptionId = `ilamy-dialog-desc-${nextDialogId}`
	if (dialog) {
		dialog.setAttribute('aria-labelledby', titleId)
		if (subtitle) {
			dialog.setAttribute('aria-describedby', descriptionId)
		}
	}
	let subtitleEl: HTMLElement | null = null
	if (subtitle) {
		subtitleEl = createEl('p', {
			text: subtitle,
			attrs: { id: descriptionId },
			className: 'mt-1.5 text-sm text-muted-foreground',
		})
	}
	return createEl(
		'div',
		{ className: 'flex items-start justify-between gap-4 shrink-0 pb-2' },
		[
			createEl('div', {}, [
				createEl('h2', {
					text: title,
					attrs: { id: titleId },
					className: 'text-lg font-semibold leading-none text-foreground',
				}),
				subtitleEl,
			]),
			createEl(
				'button',
				{
					attrs: { type: 'button', 'aria-label': 'Close' },
					className:
						'rounded-xs p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
					onClick: onClose,
				},
				[createSvgIcon('x', 'size-4')]
			),
		]
	)
}

export const createLabeledField = (
	label: string,
	htmlFor: string | undefined,
	control: HTMLElement
): HTMLElement =>
	createEl('div', {}, [
		createEl('label', {
			text: label,
			className: LABEL_CLASS,
			attrs: htmlFor ? { for: htmlFor } : undefined,
		}),
		control,
	])

export const createSelectControl = (
	options: Array<{ value: string; label: string }>,
	selectedValue: string,
	id?: string
): HTMLSelectElement => {
	const select = createEl('select', {
		className: INPUT_CLASS,
		attrs: id ? { id } : undefined,
	})
	for (const item of options) {
		const opt = createEl('option', {
			text: item.label,
			attrs: { value: item.value },
		})
		if (item.value === selectedValue) opt.selected = true
		select.appendChild(opt)
	}
	return select
}
