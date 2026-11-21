import {
	createDialogHeader,
	createManagedDialog,
	openDialogSafely,
} from './dom-dialog-shell'
import { createEl } from './dom-styles'
import type { DomMutationScope, DomRuntime } from './dom-types'

interface ScopeOption {
	value: DomMutationScope
	title: string
	description: string
}

const SCOPE_OPTIONS: ScopeOption[] = [
	{
		value: 'this',
		title: 'This Event',
		description: 'Only Change This',
	},
	{
		value: 'following',
		title: 'This and Following Events',
		description: 'Change This and Future',
	},
	{
		value: 'all',
		title: 'All Events',
		description: 'Change Entire Series',
	},
]

/** Opens the recurring edit/delete scope confirmation modal (`This`, `Following`, or `All`). */
export const openDomScopeDialog = (
	runtime: DomRuntime,
	eventTitle: string,
	mode: 'edit' | 'delete',
	onConfirm: (scope: DomMutationScope) => void
): void => {
	const { dialog, close } = createManagedDialog(
		runtime,
		'dom-scope-dialog',
		'max-w-md'
	)

	const actionWord = mode === 'delete' ? 'delete' : 'edit'
	const header = createDialogHeader(
		mode === 'delete' ? 'Delete Recurring Event' : 'Edit Recurring Event',
		`"${eventTitle}" How would you like to ${actionWord} this recurring event?`,
		close,
		dialog
	)

	const choices = createEl('div', { className: 'my-4 space-y-2.5' })
	for (const item of SCOPE_OPTIONS) {
		choices.appendChild(
			createEl(
				'button',
				{
					attrs: { type: 'button' },
					data: { testid: `dom-scope-${item.value}` },
					className:
						'w-full rounded-lg border border-border bg-background p-3.5 text-left hover:bg-accent/50 transition-colors cursor-pointer',
					onClick: () => {
						close()
						onConfirm(item.value)
					},
				},
				[
					createEl('div', {
						text: item.title,
						className: 'text-sm font-medium text-foreground',
					}),
					createEl('div', {
						text: item.description,
						className: 'mt-0.5 text-xs text-muted-foreground',
					}),
				]
			)
		)
	}

	const cancelBtn = createEl('button', {
		text: 'Cancel',
		attrs: {
			type: 'button',
			autofocus: mode === 'delete' ? '' : undefined,
		},
		className:
			'h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-accent cursor-pointer',
		onClick: close,
	})
	const footer = createEl('div', { className: 'flex justify-end pt-1' }, [
		cancelBtn,
	])

	dialog.append(header, choices, footer)
	runtime.root.appendChild(dialog)
	openDialogSafely(dialog)
}
