import React from 'react'
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
  const handleScopeSelect = (scope: RecurrenceEditScope) => {
    onConfirm(scope)
    onClose()
  }

  const actionText = operationType === 'edit' ? 'change' : 'delete'
  const actionVerb = operationType === 'edit' ? 'Edit' : 'Delete'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{actionVerb} recurring event</DialogTitle>
          <DialogDescription>
            "{eventTitle}" is a recurring event. How would you like to{' '}
            {actionText} it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('this')}
          >
            <div className="text-left">
              <div className="font-medium">This event</div>
              <div className="text-sm text-muted-foreground">
                Only {actionText} this specific occurrence
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('following')}
          >
            <div className="text-left">
              <div className="font-medium">This and following events</div>
              <div className="text-sm text-muted-foreground">
                {actionVerb} this and all future occurrences
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => handleScopeSelect('all')}
          >
            <div className="text-left">
              <div className="font-medium">All events</div>
              <div className="text-sm text-muted-foreground">
                {actionVerb} the entire recurring series
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
