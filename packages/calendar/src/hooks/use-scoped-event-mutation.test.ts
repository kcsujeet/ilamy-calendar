import { describe, expect, it, vi } from 'bun:test'
import type {
	CalendarEvent,
	IlamyPlugin,
	PluginMutationArgs,
} from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useScopedEventMutation } from './use-scoped-event-mutation'

const managedEvent: CalendarEvent = {
	id: 'managed-1',
	title: 'Managed Event',
	start: dayjs('2025-01-15T10:00:00.000Z'),
	end: dayjs('2025-01-15T11:00:00.000Z'),
}

const EDITED = [{ ...managedEvent, title: 'edited-sentinel' }]
const DELETED: CalendarEvent[] = []

// A fake plugin that manages every event and returns sentinel results so we can
// observe that the manager's applyEdit/applyDelete were invoked with the scope.
const makeFakePlugin = (
	applyEdit: (args: PluginMutationArgs) => CalendarEvent[] = () => EDITED,
	applyDelete: (args: PluginMutationArgs) => CalendarEvent[] = () => DELETED
): IlamyPlugin => ({
	name: 'fake',
	managesEvent: () => true,
	applyEdit,
	applyDelete,
})

interface RenderArgs {
	onComplete?: () => void
	plugin?: IlamyPlugin
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
}

const renderScopedMutationHook = ({
	onComplete,
	plugin = makeFakePlugin(),
	onEventUpdate,
	onEventDelete,
}: RenderArgs = {}) => {
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(CalendarProvider, {
			children,
			dayMaxEvents: 3,
			events: [managedEvent],
			plugins: [plugin],
			onEventUpdate,
			onEventDelete,
		})
	const { result } = renderHook(() => useScopedEventMutation(onComplete), {
		wrapper,
	})
	return result
}

describe('useScopedEventMutation', () => {
	it('starts closed', () => {
		const result = renderScopedMutationHook()
		expect(result.current.dialogState.isOpen).toBe(false)
		expect(result.current.dialogState.event).toBeNull()
	})

	it('openEditDialog then handleConfirm applies the manager edit and closes', () => {
		let editArgs: PluginMutationArgs | undefined
		const applyEdit = (args: PluginMutationArgs) => {
			editArgs = args
			return EDITED
		}
		const onEventUpdate = vi.fn()
		const onComplete = vi.fn()
		const result = renderScopedMutationHook({
			onComplete,
			plugin: makeFakePlugin(applyEdit),
			onEventUpdate,
		})

		act(() =>
			result.current.openEditDialog(managedEvent, { title: 'New Title' })
		)
		expect(result.current.dialogState.isOpen).toBe(true)
		expect(result.current.dialogState.operation).toBe('edit')
		expect(result.current.dialogState.updates).toEqual({ title: 'New Title' })

		act(() => result.current.handleConfirm('this'))

		expect(editArgs?.scope).toBe('this')
		expect(editArgs?.updates).toEqual({ title: 'New Title' })
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		expect(onComplete).toHaveBeenCalledTimes(1)
		expect(result.current.dialogState.isOpen).toBe(false)
	})

	it('openDeleteDialog then handleConfirm applies the manager delete and closes', () => {
		let deleteArgs: PluginMutationArgs | undefined
		const applyDelete = (args: PluginMutationArgs) => {
			deleteArgs = args
			return DELETED
		}
		const onEventDelete = vi.fn()
		const result = renderScopedMutationHook({
			plugin: makeFakePlugin(undefined, applyDelete),
			onEventDelete,
		})

		act(() => result.current.openDeleteDialog(managedEvent))
		expect(result.current.dialogState.isOpen).toBe(true)
		expect(result.current.dialogState.operation).toBe('delete')

		act(() => result.current.handleConfirm('all'))

		expect(deleteArgs?.scope).toBe('all')
		expect(onEventDelete).toHaveBeenCalledTimes(1)
		expect(result.current.dialogState.isOpen).toBe(false)
	})

	it('closeDialog dismisses an open dialog without applying', () => {
		let editCalled = false
		const applyEdit = () => {
			editCalled = true
			return EDITED
		}
		const result = renderScopedMutationHook({
			plugin: makeFakePlugin(applyEdit),
		})

		act(() => result.current.openEditDialog(managedEvent, { title: 'x' }))
		act(() => result.current.closeDialog())

		expect(result.current.dialogState.isOpen).toBe(false)
		expect(result.current.dialogState.event).toBeNull()
		expect(editCalled).toBe(false)
	})
})
