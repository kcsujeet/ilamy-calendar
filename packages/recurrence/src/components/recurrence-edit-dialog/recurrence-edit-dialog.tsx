import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Button } from '@ilamy/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@ilamy/ui/components/dialog'
import type { RecurrenceEditScope } from '../../types'

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
}

export function RecurrenceEditDialog({
	isOpen,
	onClose,
	onConfirm,
	operationType,
	eventTitle,
}: RecurrenceEditDialogProps) {
	const { t } = useIlamyCalendarContext()

	const handleScopeSelect = (scope: RecurrenceEditScope) => {
		onConfirm(scope)
		onClose()
	}

	const isEdit = operationType === 'edit'

	let title = t('deleteRecurringEvent')
	let question = t('deleteRecurringEventQuestion')
	if (isEdit) {
		title = t('editRecurringEvent')
		question = t('editRecurringEventQuestion')
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			open={isOpen}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						"{eventTitle}" {question}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{SCOPES.map(({ scope, title, editKey, deleteKey }) => (
						<Button
							className="w-full justify-start h-auto p-4"
							key={scope}
							onClick={() => handleScopeSelect(scope)}
							variant="outline"
						>
							<div className="text-left">
								<div className="font-medium">{t(title)}</div>
								<div className="text-sm text-muted-foreground">
									{t(isEdit ? editKey : deleteKey)}
								</div>
							</div>
						</Button>
					))}
				</div>

				<DialogFooter>
					<Button onClick={onClose} variant="outline">
						{t('cancel')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
