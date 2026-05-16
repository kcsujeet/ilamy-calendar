import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { RecurrenceEditScope } from '@/features/recurrence/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

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
	const { t } = useSmartCalendarContext((context) => ({ t: context.t }))

	const handleScopeSelect = (scope: RecurrenceEditScope) => {
		onConfirm(scope)
		onClose()
	}

	const isEdit = operationType === 'edit'

	return (
		<Dialog onOpenChange={onClose} open={isOpen}>
			<DialogContent className="max-w-md overflow-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t('editRecurringEvent') : t('deleteRecurringEvent')}
					</DialogTitle>
					<DialogDescription>
						"{eventTitle}"{' '}
						{isEdit
							? t('editRecurringEventQuestion')
							: t('deleteRecurringEventQuestion')}
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
