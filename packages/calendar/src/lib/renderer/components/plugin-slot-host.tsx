/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from 'preact/hooks'
import type {
	CalendarPlugin,
	PluginSlotName,
	SlotMountHandle,
} from '../../../index'
import { rendererKeys } from '../utils/keys.utils'

interface SinglePluginSlotProps {
	plugin: CalendarPlugin
	slotName: PluginSlotName
	context: unknown
}

const SinglePluginSlot = ({
	plugin,
	slotName,
	context,
}: SinglePluginSlotProps) => {
	const hostRef = useRef<HTMLDivElement>(null)
	const handleRef = useRef<SlotMountHandle<unknown> | null>(null)
	const latestContextRef = useRef(context)
	const mountedThisCommitRef = useRef(false)

	latestContextRef.current = context

	useLayoutEffect(() => {
		const host = hostRef.current
		if (!(host && plugin.mountSlot)) return
		const handle = plugin.mountSlot(slotName, host, latestContextRef.current)
		handleRef.current = handle
		mountedThisCommitRef.current = true
		return () => {
			handle?.destroy()
			handleRef.current = null
		}
	}, [plugin, slotName])

	useLayoutEffect(() => {
		if (mountedThisCommitRef.current) {
			mountedThisCommitRef.current = false
			return
		}
		handleRef.current?.update(context)
	}, [context])

	return (
		<div
			data-ilamy-plugin-slot={rendererKeys.key.pluginSlot(
				slotName,
				plugin.name
			)}
			ref={hostRef}
			style={{ display: 'contents' }}
		/>
	)
}

interface PluginSlotHostProps {
	plugins: readonly CalendarPlugin[]
	slotName: PluginSlotName
	context: unknown
}

/**
 * Mounts every plugin's `mountSlot` contribution for a named extension point and
 * updates mounted handles in place across context changes.
 */
export const PluginSlotHost = ({
	plugins,
	slotName,
	context,
}: PluginSlotHostProps) => {
	const slotPlugins = plugins.filter((plugin) => Boolean(plugin.mountSlot))
	if (slotPlugins.length === 0) return null

	return (
		<>
			{slotPlugins.map((plugin) => (
				<SinglePluginSlot
					context={context}
					key={rendererKeys.key.pluginSlot(slotName, plugin.name)}
					plugin={plugin}
					slotName={slotName}
				/>
			))}
		</>
	)
}
