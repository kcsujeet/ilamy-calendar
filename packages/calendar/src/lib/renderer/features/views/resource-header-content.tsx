/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks'
import type {
	HeadlessCalendarController,
	Resource,
	ResourceSlotContext,
} from '../../../../index'
import { LegacyRenderHost, SlotHost } from '../../components/slot-host'
import type {
	DomCalendarOptions,
	DomResourceRenderContext,
} from '../../types/renderer.types'
import { rendererKeys } from '../../utils/keys.utils'

interface ResourceHeaderContentProps {
	resource: Resource
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	truncate?: boolean
}

export const ResourceHeaderContent = ({
	resource,
	controller,
	options,
	truncate = false,
}: ResourceHeaderContentProps) => {
	const state = controller.getState()
	const slotCtx = useMemo<ResourceSlotContext>(
		() => ({
			resource,
			view: state.view,
			orientation: options.orientation ?? 'horizontal',
		}),
		[resource, state.view, options.orientation]
	)
	const legacyCtx = useMemo<DomResourceRenderContext>(
		() => ({ resource, view: state.view }),
		[resource, state.view]
	)
	const slotKey = rendererKeys.key.slot('resource', resource.id)

	if (options.slots?.resource) {
		return (
			<SlotHost
				context={slotCtx}
				slot={options.slots.resource}
				slotKey={slotKey}
			/>
		)
	}
	if (options.renderResource) {
		return (
			<LegacyRenderHost
				context={legacyCtx}
				renderFn={options.renderResource}
				slotKey={slotKey}
			/>
		)
	}
	return (
		<span
			style={
				truncate ? { overflow: 'hidden', textOverflow: 'ellipsis' } : undefined
			}
		>
			{resource.title}
		</span>
	)
}
