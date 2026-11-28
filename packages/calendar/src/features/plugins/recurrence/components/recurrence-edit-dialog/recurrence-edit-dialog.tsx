/** @jsxImportSource preact */
import { createTranslator, type TranslatorFunction } from '@ilamy/calendar'
import { DialogShell } from '../../../../../lib/renderer/components/dialog-shell'
import { rendererKeys } from '../../../../../lib/renderer/utils/keys.utils'
import type { RecurrenceEditScope } from '../../types'

const defaultT: TranslatorFunction = createTranslator()

const SCOPES = [
	{
		scope: 'this',
		title: 'thisEvent',
		editKey: 'onlyChangeThis',
		deleteKey: 'onlyDeleteThis',
	},
	{
		scope: 'following',
		title: 'thisAndFollowingEvents',
		editKey: 'changeThisAndFuture',
		deleteKey: 'deleteThisAndFuture',
	},
	{
		scope: 'all',
		title: 'allEvents',
		editKey: 'changeEntireSeries',
		deleteKey: 'deleteEntireSeries',
	},
] as const

interface RecurrenceEditDialogProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (scope: RecurrenceEditScope) => void
	operationType: 'edit' | 'delete'
	eventTitle: string
	t?: TranslatorFunction
}

export function RecurrenceEditDialog({
	isOpen,
	onClose,
	onConfirm,
	operationType,
	eventTitle,
	t = defaultT,
}: RecurrenceEditDialogProps) {
	const handleScopeSelect = (scope: RecurrenceEditScope) => {
		onConfirm(scope)
		onClose()
	}

	const isEdit = operationType === 'edit'
	const title = t(isEdit ? 'editRecurringEvent' : 'deleteRecurringEvent')
	const question = t(
		isEdit ? 'editRecurringEventQuestion' : 'deleteRecurringEventQuestion'
	)
	const subtitle = `"${eventTitle}" ${question}`

	return (
		<DialogShell
			maxWidth="440px"
			onClose={onClose}
			open={isOpen}
			showCloseButton={false}
			subtitle={subtitle}
			testId="recurrence-edit-dialog"
			title={title}
		>
			<div data-ilamy-part="dialog-body">
				<div data-ilamy-part="form-stack">
					{SCOPES.map(({ scope, title: titleKey, editKey, deleteKey }) => (
						<button
							data-ilamy-part="scope-option"
							data-testid={rendererKeys.testId.scopeOption(scope)}
							key={scope}
							onClick={() => handleScopeSelect(scope)}
							type="button"
						>
							<div data-ilamy-part="scope-option-title">{t(titleKey)}</div>
							<div data-ilamy-part="scope-option-desc">
								{t(isEdit ? editKey : deleteKey)}
							</div>
						</button>
					))}
				</div>
			</div>

			<div data-ilamy-part="dialog-footer">
				<button data-ilamy-part="btn" onClick={onClose} type="button">
					{t('cancel')}
				</button>
			</div>
		</DialogShell>
	)
}
