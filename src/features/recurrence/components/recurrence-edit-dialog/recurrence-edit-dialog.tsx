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
			<DialogContent className="max-w-md">
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
					<Button
						className="w-full justify-start h-auto p-4"
						onClick={() => handleScopeSelect('this')}
						variant="outline"
					>
						<div className="text-left">
							<div className="font-medium">{t('thisEvent')}</div>
							<div className="text-sm text-muted-foreground">
								{isEdit ? t('onlyChangeThis') : t('onlyDeleteThis')}
							</div>
						</div>
					</Button>

					<Button
						className="w-full justify-start h-auto p-4"
						onClick={() => handleScopeSelect('following')}
						variant="outline"
					>
						<div className="text-left">
							<div className="font-medium">{t('thisAndFollowingEvents')}</div>
							<div className="text-sm text-muted-foreground">
								{isEdit ? t('changeThisAndFuture') : t('deleteThisAndFuture')}
							</div>
						</div>
					</Button>

					<Button
						className="w-full justify-start h-auto p-4"
						onClick={() => handleScopeSelect('all')}
						variant="outline"
					>
						<div className="text-left">
							<div className="font-medium">{t('allEvents')}</div>
							<div className="text-sm text-muted-foreground">
								{isEdit ? t('changeEntireSeries') : t('deleteEntireSeries')}
							</div>
						</div>
					</Button>
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
