/** @jsxImportSource preact */
import { useMemo, useRef } from 'preact/hooks'
import {
	type PluginMutationScopeContext,
	type RecurrenceScopeDialogSlotContext,
	SLOT_EVENT_MUTATION_SCOPE,
} from '../../../../index'
import { PluginSlotHost } from '../../components/plugin-slot-host'
import { SlotHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	DomMutationScope,
	RendererActions,
} from '../../types/renderer.types'

export interface ScopeDialogState {
	open: boolean
	event: DomCalendarEvent | null
	operation: 'edit' | 'delete'
	onConfirm?: (scope: DomMutationScope) => void
}

interface RecurrenceScopeDialogProps {
	state: ScopeDialogState
	options: DomCalendarOptions
	actions: RendererActions
	onCancel: () => void
}

export const RecurrenceScopeDialog = ({
	state,
	options,
	actions,
	onCancel,
}: RecurrenceScopeDialogProps) => {
	const stateRef = useRef(state)
	stateRef.current = state

	const slotContext = useMemo<RecurrenceScopeDialogSlotContext>(
		() => ({
			open: state.open,
			event: state.event,
			operation: state.operation,
			onConfirm: (scope) => {
				const cb = stateRef.current.onConfirm
				onCancel()
				cb?.(scope)
			},
			onCancel,
			t: actions.t,
		}),
		[state, actions.t, onCancel]
	)

	const pluginScopeContext = useMemo<PluginMutationScopeContext | null>(() => {
		if (!state.event) return null
		return {
			event: state.event,
			operation: state.operation,
			resolve: (scope) => {
				const cb = stateRef.current.onConfirm
				onCancel()
				cb?.(scope)
			},
			cancel: onCancel,
			t: actions.t,
		}
	}, [state.event, state.operation, actions.t, onCancel])

	if (options.slots?.recurrenceScopeDialog) {
		return (
			<SlotHost
				context={slotContext}
				slot={options.slots.recurrenceScopeDialog}
				slotKey="recurrenceScopeDialog"
			/>
		)
	}

	if (!state.open || !state.event || !pluginScopeContext) return null

	const manager = actions.pluginRuntime.getEventManager(state.event)
	if (!manager) return null

	return (
		<PluginSlotHost
			context={pluginScopeContext}
			plugins={[manager]}
			slotName={SLOT_EVENT_MUTATION_SCOPE}
		/>
	)
}
