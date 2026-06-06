import { useCallback, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

export interface ScopedMutationDialogState {
	isOpen: boolean
	operation: 'edit' | 'delete'
	event: CalendarEvent | null
	updates?: Partial<CalendarEvent>
}

const CLOSED: ScopedMutationDialogState = {
	isOpen: false,
	operation: 'edit',
	event: null,
}

export interface ScopedEventMutation {
	dialogState: ScopedMutationDialogState
	openEditDialog: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>
	) => void
	openDeleteDialog: (event: CalendarEvent) => void
	closeDialog: () => void
	handleConfirm: (scope: unknown) => void
}

export function useScopedEventMutation(
	onComplete?: () => void
): ScopedEventMutation {
	const { applyScopedEdit, applyScopedDelete } = useSmartCalendarContext(
		(c) => ({
			applyScopedEdit: c.applyScopedEdit,
			applyScopedDelete: c.applyScopedDelete,
		})
	)
	const [dialogState, setDialogState] =
		useState<ScopedMutationDialogState>(CLOSED)

	const openEditDialog = useCallback(
		(event: CalendarEvent, updates: Partial<CalendarEvent>) => {
			setDialogState({ isOpen: true, operation: 'edit', event, updates })
		},
		[]
	)

	const openDeleteDialog = useCallback((event: CalendarEvent) => {
		setDialogState({ isOpen: true, operation: 'delete', event })
	}, [])

	const closeDialog = useCallback(() => setDialogState(CLOSED), [])

	const handleConfirm = useCallback(
		(scope: unknown) => {
			setDialogState((state) => {
				if (state.event) {
					if (state.operation === 'edit') {
						applyScopedEdit(state.event, state.updates ?? {}, scope)
					} else {
						applyScopedDelete(state.event, scope)
					}
				}
				return CLOSED
			})
			onComplete?.()
		},
		[applyScopedEdit, applyScopedDelete, onComplete]
	)

	return {
		dialogState,
		openEditDialog,
		openDeleteDialog,
		closeDialog,
		handleConfirm,
	}
}
