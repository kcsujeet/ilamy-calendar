import type { CalendarEvent } from '@ilamy/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

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
	const dialogStateRef = useRef(dialogState)
	useEffect(() => {
		dialogStateRef.current = dialogState
	}, [dialogState])

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

	// Side effects must not run inside a setState updater — React StrictMode
	// (enabled in the demo) intentionally double-invokes updaters in dev.
	const handleConfirm = useCallback(
		(scope: unknown) => {
			const state = dialogStateRef.current
			if (!state.event) {
				return
			}
			if (state.operation === 'edit') {
				applyScopedEdit(state.event, state.updates ?? {}, scope)
			} else {
				applyScopedDelete(state.event, scope)
			}
			setDialogState(CLOSED)
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
