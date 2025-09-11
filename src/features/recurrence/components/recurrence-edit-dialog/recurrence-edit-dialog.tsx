import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/ui'
import type { RecurrenceEditScope } from '@/features/recurrence/types'
import { useSmartCalendarContext } from '@/lib/hooks/use-smart-calendar-context'

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
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('this')}
          >
            <div className="text-left">
              <div className="font-medium">{t('thisEvent')}</div>
              <div className="text-sm text-muted-foreground">
                {isEdit ? t('onlyChangeThis') : t('onlyDeleteThis')}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('following')}
          >
            <div className="text-left">
              <div className="font-medium">{t('thisAndFollowingEvents')}</div>
              <div className="text-sm text-muted-foreground">
                {isEdit ? t('changeThisAndFuture') : t('deleteThisAndFuture')}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('all')}
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
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
