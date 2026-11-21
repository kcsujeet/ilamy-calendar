import type { DomCalendarOptions } from '@ilamy/calendar/vue'
import { useEffect, useRef } from 'react'
import type { FrameworkId } from '../../../types/settings-form.types'

interface FrameworkCalendarHostProps {
	framework: Exclude<FrameworkId, 'react'>
	options: DomCalendarOptions
	height: string
}

interface MountedHandle {
	update: (next: DomCalendarOptions) => void
	destroy: () => void
}

async function mountFrameworkRuntime(
	framework: Exclude<FrameworkId, 'react'>,
	container: HTMLElement,
	getLatestOptions: () => DomCalendarOptions,
	isCancelled: () => boolean
): Promise<MountedHandle | null> {
	if (framework === 'vue') {
		const [{ createApp, h, shallowRef }, { IlamyCalendar }] = await Promise.all(
			[import('vue'), import('@ilamy/calendar/vue')]
		)
		if (isCancelled()) return null
		const optsRef = shallowRef<DomCalendarOptions>(getLatestOptions())
		const app = createApp({
			setup() {
				return () => h(IlamyCalendar, { options: optsRef.value })
			},
		})
		app.mount(container)
		return {
			update: (next) => {
				optsRef.value = next
			},
			destroy: () => {
				app.unmount()
			},
		}
	}

	if (framework === 'svelte') {
		const { ilamyCalendarAction } = await import('@ilamy/calendar/svelte')
		if (isCancelled()) return null
		const action = ilamyCalendarAction(container, getLatestOptions())
		return {
			update: (next) => {
				action?.update?.(next)
			},
			destroy: () => {
				action?.destroy?.()
			},
		}
	}

	if (framework === 'solid') {
		const [{ createRoot, createSignal, flush }, { mountSolidCalendar }] =
			await Promise.all([import('solid-js'), import('@ilamy/calendar/solid')])
		if (isCancelled()) return null
		let setOptions: ((next: DomCalendarOptions) => void) | undefined
		let disposeRoot: (() => void) | undefined

		createRoot((dispose) => {
			disposeRoot = dispose
			const [opts, setOpts] =
				createSignal<DomCalendarOptions>(getLatestOptions())
			setOptions = (next) => {
				setOpts(() => next)
				flush()
			}
			mountSolidCalendar(container, () => opts())
		})
		flush()

		return {
			update: (next) => {
				setOptions?.(next)
			},
			destroy: () => {
				disposeRoot?.()
			},
		}
	}

	// Angular 22 standalone Custom Element + Signals
	const { registerIlamyCalendarElement } =
		await import('@ilamy/calendar/angular')
	if (isCancelled()) return null
	registerIlamyCalendarElement()
	const el = document.createElement('ilamy-calendar') as HTMLElement & {
		options: DomCalendarOptions
	}
	el.options = getLatestOptions()
	container.appendChild(el)
	return {
		update: (next) => {
			el.options = next
		},
		destroy: () => {
			el.remove()
		},
	}
}

/**
 * Mounts the real Vue 3.5, Svelte 5, Solid 2.0, or Angular 22 runtime inside the
 * Playground preview stage, syncing option updates live and tearing down cleanly.
 */
export function FrameworkCalendarHost({
	framework,
	options,
	height,
}: FrameworkCalendarHostProps) {
	const hostRef = useRef<HTMLDivElement | null>(null)
	const handleRef = useRef<MountedHandle | null>(null)
	const latestOptionsRef = useRef<DomCalendarOptions>(options)
	latestOptionsRef.current = options

	useEffect(() => {
		const host = hostRef.current
		if (!host) return
		let cancelled = false

		const mountNode = document.createElement('div')
		mountNode.style.width = '100%'
		mountNode.style.height = '100%'
		host.appendChild(mountNode)

		void mountFrameworkRuntime(
			framework,
			mountNode,
			() => latestOptionsRef.current,
			() => cancelled
		).then((mounted) => {
			if (!mounted) return
			if (cancelled) {
				mounted.destroy()
				return
			}
			handleRef.current = mounted
			mounted.update(latestOptionsRef.current)
		})

		return () => {
			cancelled = true
			handleRef.current?.destroy()
			handleRef.current = null
			mountNode.remove()
		}
	}, [framework])

	useEffect(() => {
		handleRef.current?.update(options)
	}, [options])

	return (
		<div
			className="w-full overflow-clip relative"
			data-testid={`framework-stage-${framework}`}
			ref={hostRef}
			style={{ height }}
		/>
	)
}
