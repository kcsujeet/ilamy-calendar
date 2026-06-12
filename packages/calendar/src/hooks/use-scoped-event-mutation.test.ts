import { describe, expect, it, vi } from 'bun:test'
import type {
	CalendarEvent,
	IlamyPlugin,
	PluginMutationArgs,
	PluginMutationResult,
} from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode, StrictMode } from 'react'
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

const makeMutationResult = (
	events: CalendarEvent[],
	updated: CalendarEvent[],
	added: CalendarEvent[] = []
): PluginMutationResult => ({ events, updated, added })

// A fake plugin that manages every event and returns sentinel results so we can
// observe that the manager's applyEdit/applyDelete were invoked with the scope.
const makeFakePlugin = (
	applyEdit: (
		args: PluginMutationArgs
	) => CalendarEvent[] | PluginMutationResult = () => EDITED,
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
	onEventAdd?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	strictMode?: boolean
}

const renderScopedMutationHook = ({
	onComplete,
	plugin = makeFakePlugin(),
	onEventUpdate,
	onEventAdd,
	onEventDelete,
	strictMode = false,
}: RenderArgs = {}) => {
	const wrapper = ({ children }: { children: ReactNode }) => {
		const provider = createElement(CalendarProvider, {
			children,
			dayMaxEvents: 3,
			events: [managedEvent],
			plugins: [plugin],
			onEventUpdate,
			onEventAdd,
			onEventDelete,
		})
		return strictMode ? createElement(StrictMode, null, provider) : provider
	}
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

	it('handleConfirm fires persistence callbacks once under StrictMode', () => {
		let editCallCount = 0
		const updatedRow = { ...managedEvent, title: 'Strict once' }
		const applyEdit = () => {
			editCallCount += 1
			return makeMutationResult([updatedRow], [updatedRow], [])
		}
		const onEventUpdate = vi.fn()
		const onEventAdd = vi.fn()
		const result = renderScopedMutationHook({
			strictMode: true,
			plugin: makeFakePlugin(applyEdit),
			onEventUpdate,
			onEventAdd,
		})

		act(() =>
			result.current.openEditDialog(managedEvent, { title: 'Strict once' })
		)
		act(() => result.current.handleConfirm('this'))

		expect(editCallCount).toBe(1)
		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		expect(onEventAdd).not.toHaveBeenCalled()
	})
})
