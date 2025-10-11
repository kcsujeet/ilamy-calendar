import { useState, useCallback } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { RecurrenceEditScope } from '@/features/recurrence/types'

export function useRecurringEventActions(onComplete?: () => void) {
  const { updateRecurringEvent, deleteRecurringEvent } =
    useSmartCalendarContext((context) => ({
      updateRecurringEvent: context.updateRecurringEvent,
      deleteRecurringEvent: context.deleteRecurringEvent,
    }))

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    operationType: 'edit' | 'delete'
    event: CalendarEvent | null
    updates?: Partial<CalendarEvent>
    onConfirm?: (scope: RecurrenceEditScope) => void
  }>({
    isOpen: false,
    operationType: 'edit',
    event: null,
  })

  const openEditDialog = useCallback(
    (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
      setDialogState({
        isOpen: true,
        operationType: 'edit',
        event,
        updates,
        onConfirm: (scope: RecurrenceEditScope) => {
          updateRecurringEvent(event, updates, {
            scope,
            eventDate: event.start,
          })
        },
      })
    },
    [updateRecurringEvent]
  )

  const openDeleteDialog = useCallback(
    (event: CalendarEvent) => {
      setDialogState({
        isOpen: true,
        operationType: 'delete',
        event,
        onConfirm: (scope: RecurrenceEditScope) => {
          deleteRecurringEvent(event, {
            scope,
            eventDate: event.start,
          })
        },
      })
    },
    [deleteRecurringEvent]
  )

  const closeDialog = useCallback(() => {
    setDialogState({
      isOpen: false,
      operationType: 'edit',
      event: null,
    })
  }, [])

  const handleConfirm = useCallback(
    (scope: RecurrenceEditScope) => {
      if (dialogState.onConfirm) {
        dialogState.onConfirm(scope)
      }
      closeDialog()
      // Call onComplete to close the parent form
      onComplete?.()
    },
    [dialogState, closeDialog, onComplete]
  )

  return {
    dialogState,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    handleConfirm,
  }
}
