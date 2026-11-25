import { afterEach, describe, expect, it } from 'bun:test'
import { unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compile } from 'svelte/compiler'
import {
	createIlamyCalendar,
	createSvelteSlotMount,
	ilamyCalendar,
	ilamyCalendarAction,
	mountIlamyCalendar,
} from './index'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/adapter-svelte', () => {
	it('creates a reactive Svelte 5 calendar store with createIlamyCalendar', () => {
		const cal = createIlamyCalendar({
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
		})

		expect(cal.view).toBe('week')
		cal.setView('day')
		expect(cal.view).toBe('day')

		cal.addEvent({
			id: 's1',
			title: 'Svelte 5 Runes Sync',
			start: '2026-11-19T10:00:00Z',
			end: '2026-11-19T11:00:00Z',
		})
		expect(cal.events).toHaveLength(1)
		expect(cal.events.at(0)?.title).toBe('Svelte 5 Runes Sync')
	})

	it('mounts and cleans up via Svelte 5 Attachment (ilamyCalendar)', () => {
		const el = document.createElement('div')
		document.body.appendChild(el)

		const attach = ilamyCalendar({
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			events: [
				{
					id: 'att-1',
					title: 'Svelte Attachment Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})
		const cleanup = attach(el)

		expect(el.dataset.ilamyFramework).toBe('svelte')
		expect(el.textContent).toContain('Svelte Attachment Event')

		if (typeof cleanup === 'function') cleanup()
		expect(el.querySelector('[data-testid="ilamy-calendar"]')).toBeNull()
	})

	it('updates in-place via Svelte Action (ilamyCalendarAction)', () => {
		const el = document.createElement('div')
		document.body.appendChild(el)

		const action = ilamyCalendarAction(el, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			events: [
				{
					id: 'act-1',
					title: 'Initial Svelte Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})

		expect(el.textContent).toContain('Initial Svelte Event')
		action?.update?.({
			events: [
				{
					id: 'act-1',
					title: 'Updated Svelte Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})
		expect(el.textContent).toContain('Updated Svelte Event')

		action?.destroy?.()
		expect(el.querySelector('[data-testid="ilamy-calendar"]')).toBeNull()
	})

	it('renders a Svelte 5 component importing mountIlamyCalendar and createSvelteSlotMount safely during SSR', () => {
		expect(typeof mountIlamyCalendar).toBe('function')
		expect(typeof createSvelteSlotMount).toBe('function')

		const pkgRoot = resolve(import.meta.dir, '../../../..')
		const repoRoot = resolve(pkgRoot, '../..')
		const svelteModulePath = resolve(import.meta.dir, './index.ts')
		const compiled = compile(
			`<script lang="ts">
import { onMount } from 'svelte'
import { mountIlamyCalendar } from ${JSON.stringify(svelteModulePath)}
let host: HTMLDivElement | null = null
onMount(() => {
	if (!host) return
	const mounted = mountIlamyCalendar(host, { timezone: 'UTC' })
	return () => mounted.destroy()
})
</script>
<div data-testid="svelte-ssr-root" bind:this={host}>SSR Ready</div>`,
			{ generate: 'server', filename: 'SvelteAdapterSsr.svelte' }
		)

		const tempComponent = resolve(pkgRoot, '.tmp-svelte-adapter-ssr.mjs')
		writeFileSync(tempComponent, compiled.js.code)
		try {
			const proc = Bun.spawnSync(
				[
					'bun',
					'-e',
					`
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  throw new Error('Expected zero DOM globals during SSR check');
}
import { render } from 'svelte/server';
import SsrComp from ${JSON.stringify(tempComponent)};
console.log(render(SsrComp).body);
`,
				],
				{ cwd: repoRoot, stdout: 'pipe', stderr: 'pipe' }
			)
			expect(proc.exitCode, proc.stderr.toString('utf8')).toBe(0)
			expect(proc.stdout.toString('utf8')).toContain(
				'data-testid="svelte-ssr-root"'
			)
		} finally {
			unlinkSync(tempComponent)
		}
	})
})
