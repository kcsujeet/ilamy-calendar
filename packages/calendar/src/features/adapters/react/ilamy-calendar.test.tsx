/** @jsxImportSource react */
import { afterEach, describe, expect, it } from 'bun:test'
import { resolve } from 'node:path'
import {
	act,
	createContext,
	createRef,
	StrictMode,
	useContext,
	useEffect,
	useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import type { HeaderSlotContext } from '../../../index'
import { IlamyCalendar, useIlamyCalendarContext } from './index'
import { CalendarTestProvider } from './testing/index'
import type { EventFormProps, IlamyCalendarApi } from './types'

const AppThemeContext = createContext('default')
let headerMountCalls = 0
let legacyFormMountCalls = 0

const CustomHeader = ({ title, nextPeriod }: HeaderSlotContext) => {
	const theme = useContext(AppThemeContext)
	const api = useIlamyCalendarContext()
	const [draft, setDraft] = useState('')

	useEffect(() => {
		headerMountCalls += 1
	}, [])

	return (
		<div data-testid="react-custom-header">
			<span data-testid="header-theme">{theme}</span>
			<span data-testid="header-title">{title}</span>
			<span data-testid="header-api-date">{api.currentDate}</span>
			<input
				data-testid="header-search"
				onChange={(e) => setDraft(e.target.value)}
				value={draft}
			/>
			<button
				data-testid="header-next"
				onClick={() => nextPeriod()}
				type="button"
			>
				Next
			</button>
		</div>
	)
}

const ContextHeaderElement = () => {
	const api = useIlamyCalendarContext()
	return (
		<div data-testid="legacy-header-element">
			<span data-testid="legacy-header-view">{api.view}</span>
			<button
				data-testid="legacy-header-next"
				onClick={() => api.nextPeriod()}
				type="button"
			>
				Next
			</button>
		</div>
	)
}

const LegacyFormComponent = ({
	open,
	selectedEvent,
	onAdd,
	onClose,
}: EventFormProps) => {
	useEffect(() => {
		legacyFormMountCalls += 1
	}, [])
	if (!open) return null
	return (
		<div data-testid="legacy-form-modal">
			<span data-testid="legacy-form-title">
				{selectedEvent?.title ?? 'new'}
			</span>
			<button
				data-testid="legacy-form-save"
				onClick={() => {
					onAdd?.({
						id: 'added-1',
						title: 'Added via Legacy Form',
						start: '2025-03-12T10:00:00+00:00',
						end: '2025-03-12T11:00:00+00:00',
					})
					onClose()
				}}
				type="button"
			>
				Save
			</button>
		</div>
	)
}

const TestProviderConsumer = () => {
	const api = useIlamyCalendarContext()
	return (
		<div>
			<span data-testid="tp-view">{api.view}</span>
			<button
				data-testid="tp-next"
				onClick={() => api.nextPeriod()}
				type="button"
			>
				Next
			</button>
		</div>
	)
}

describe('Thin React 19 IlamyCalendar adapter', () => {
	let container: HTMLDivElement | null = null
	let root: Root | null = null

	afterEach(() => {
		if (root) {
			act(() => {
				root?.unmount()
			})
		}
		root = null
		container?.remove()
		container = null
	})

	it('mounts region slots once without remounting, keeps focus/state, and works under StrictMode', async () => {
		headerMountCalls = 0
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)

		act(() => {
			root?.render(
				<StrictMode>
					<AppThemeContext.Provider value="indigo">
						<IlamyCalendar
							initialDate="2025-03-12T09:00:00Z"
							slots={{ header: CustomHeader }}
							timezone="UTC"
						/>
					</AppThemeContext.Provider>
				</StrictMode>
			)
		})

		const initialMounts = headerMountCalls
		expect(initialMounts).toBeGreaterThanOrEqual(1)
		expect(
			container.querySelector('[data-testid="header-theme"]')?.textContent
		).toBe('indigo')
		expect(
			container.querySelector('[data-testid="header-title"]')?.textContent
		).toBe('Mar 2025')

		const input = container.querySelector<HTMLInputElement>(
			'[data-testid="header-search"]'
		)
		expect(input).toBeInstanceOf(HTMLInputElement)
		input?.focus()
		await act(async () => {
			container
				?.querySelector<HTMLButtonElement>('[data-testid="header-next"]')
				?.click()
			await new Promise((r) => setTimeout(r, 0))
		})

		expect(
			container.querySelector('[data-testid="header-title"]')?.textContent
		).toBe('Apr 2025')
		expect(headerMountCalls).toBe(initialMounts)
		expect(document.activeElement).toBe(input)
	})

	it('exposes live getters on ref.current across navigation without parent re-renders', async () => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		const calRef = createRef<IlamyCalendarApi>()
		let resourceFetches = 0

		act(() => {
			root?.render(
				<IlamyCalendar
					initialDate="2025-03-12T09:00:00Z"
					initialView="month"
					ref={calRef}
					resources={async () => {
						resourceFetches += 1
						return [{ id: 'r1', title: 'Room 1' }]
					}}
					timezone="UTC"
				/>
			)
		})

		expect(calRef.current?.view).toBe('month')
		expect(calRef.current?.currentDate).toContain('2025-03-')

		await act(async () => {
			calRef.current?.setView('week')
			calRef.current?.nextPeriod()
			calRef.current?.refetchResources()
			await new Promise((r) => setTimeout(r, 0))
		})

		expect(calRef.current?.view).toBe('week')
		expect(calRef.current?.currentDate).toContain('2025-03-19')
		expect(resourceFetches).toBeGreaterThanOrEqual(2)
	})

	it('bridges v3 headerComponent, renderEvent, renderHour, and renderEventForm through React portals', async () => {
		legacyFormMountCalls = 0
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		const calRef = createRef<IlamyCalendarApi>()

		act(() => {
			root?.render(
				<IlamyCalendar
					events={[
						{
							id: 'e1',
							title: 'Legacy Portal Event',
							start: '2025-03-12T10:00:00Z',
							end: '2025-03-12T11:00:00Z',
						},
					]}
					headerComponent={<ContextHeaderElement />}
					initialDate="2025-03-12T09:00:00Z"
					initialView="week"
					ref={calRef}
					renderEvent={(evt) => (
						<span data-testid={`legacy-evt-${evt.id}`}>{evt.title}</span>
					)}
					renderEventForm={(formProps) => (
						<LegacyFormComponent {...formProps} />
					)}
					renderHour={(iso) => (
						<span data-testid={`hr-${iso.slice(11, 13)}`}>H</span>
					)}
					timezone="UTC"
				/>
			)
		})

		expect(
			container.querySelector('[data-testid="legacy-header-view"]')?.textContent
		).toBe('week')
		expect(
			container.querySelector('[data-testid="legacy-evt-e1"]')?.textContent
		).toBe('Legacy Portal Event')
		expect(container.querySelector('[data-testid="hr-09"]')?.textContent).toBe(
			'H'
		)

		await act(async () => {
			calRef.current?.openEventForm()
			await new Promise((r) => setTimeout(r, 0))
		})
		expect(
			container.querySelector('[data-testid="legacy-form-modal"]')
		).not.toBeNull()
		expect(legacyFormMountCalls).toBe(1)

		await act(async () => {
			container
				?.querySelector<HTMLButtonElement>('[data-testid="legacy-form-save"]')
				?.click()
			await new Promise((r) => setTimeout(r, 0))
		})
		expect(calRef.current?.events.some((e) => e.id === 'added-1')).toBe(true)
	})

	it('renders safely in SSR and provides CalendarTestProvider context', () => {
		const html = renderToString(
			<IlamyCalendar initialDate="2025-03-12T09:00:00Z" timezone="UTC" />
		)
		expect(html).toContain('data-ilamy-framework="react"')

		const repoRoot = resolve(import.meta.dir, '../../../../..')
		const modulePath = resolve(import.meta.dir, './index.ts')
		const proc = Bun.spawnSync(
			[
				'bun',
				'-e',
				`
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  throw new Error('Expected zero DOM globals');
}
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { IlamyCalendar } from ${JSON.stringify(modulePath)};
console.log(renderToString(createElement(IlamyCalendar, { initialDate: '2025-03-12T09:00:00Z', timezone: 'UTC' })));
`,
			],
			{ cwd: repoRoot, stdout: 'pipe', stderr: 'pipe' }
		)
		expect(proc.exitCode, proc.stderr.toString('utf8')).toBe(0)
		expect(proc.stdout.toString('utf8')).toContain(
			'data-ilamy-framework="react"'
		)

		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		act(() => {
			root?.render(
				<CalendarTestProvider
					initialDate="2025-03-12T09:00:00Z"
					initialView="day"
					timezone="UTC"
				>
					<TestProviderConsumer />
				</CalendarTestProvider>
			)
		})
		expect(
			container.querySelector('[data-testid="tp-view"]')?.textContent
		).toBe('day')
	})
})
