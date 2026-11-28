import { useEffect, useRef } from 'react'
import { mount, unmount } from 'svelte'
import SpikeSvelteApp from './SpikeSvelteApp.svelte'

/** Mounts the Svelte 5 + bits-ui Phase 0 fixture inside the E2E Vite harness. */
export const SvelteSpikeHost = () => {
	const hostRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const target = hostRef.current
		if (!target) {
			return
		}
		const instance = mount(SpikeSvelteApp, { target })
		return () => {
			void unmount(instance)
		}
	}, [])

	return <div data-testid="svelte-spike-host" ref={hostRef} />
}
