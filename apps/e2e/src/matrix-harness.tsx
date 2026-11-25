import type {
	CalendarEvent,
	CalendarPlugin,
	CalendarSlotProps,
	CalendarSlots,
	CellInfo,
	DomCalendarOptions,
	EventsChange,
	Resource,
} from '@ilamy/calendar'
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'
import { yearPlugin } from '@ilamy/calendar/plugins/year'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HarnessCss, HarnessFramework, UrlConfig } from './harness-config'
import type { PublishedChange, PublishedRow } from './published-change'
import type { Scenario, ViewName } from './scenarios'

interface SlotCounterState {
	mounts: Record<string, number>
	updates: Record<string, number>
	destroys: Record<string, number>
}

const createCustomMatrixSlots = (): CalendarSlots => {
	const win = window as unknown as { __matrixSlotCounts?: SlotCounterState }
	const getCounts = (): SlotCounterState => {
		win.__matrixSlotCounts ??= { mounts: {}, updates: {}, destroys: {} }
		return win.__matrixSlotCounts
	}
	const bump = (bucketName: keyof SlotCounterState, key: string) => {
		const bucket = getCounts()[bucketName]
		bucket[key] = (bucket[key] ?? 0) + 1
	}

	return {
		header: {
			mount: (host, ctx) => {
				bump('mounts', 'header')
				const wrap = document.createElement('div')
				wrap.dataset.testid = 'custom-slot-header'
				const title = document.createElement('span')
				title.dataset.testid = 'custom-slot-title'
				title.textContent = ctx.title
				const input = document.createElement('input')
				input.dataset.testid = 'custom-slot-focus-input'
				input.addEventListener('keydown', (evt) => {
					if (evt.key === 'Enter') ctx.nextPeriod()
				})
				const nextBtn = document.createElement('button')
				nextBtn.type = 'button'
				nextBtn.dataset.testid = 'custom-slot-next'
				nextBtn.textContent = 'Next'
				nextBtn.addEventListener('click', () => ctx.nextPeriod())
				const newBtn = document.createElement('button')
				newBtn.type = 'button'
				newBtn.dataset.testid = 'custom-slot-new'
				newBtn.textContent = 'New'
				newBtn.addEventListener('click', () => ctx.openEventForm())
				wrap.append(title, input, nextBtn, newBtn)
				host.appendChild(wrap)
				return {
					update: (next) => {
						bump('updates', 'header')
						title.textContent = next.title
					},
					destroy: () => {
						bump('destroys', 'header')
						wrap.remove()
					},
				}
			},
		},
		event: {
			mount: (host, ctx) => {
				bump('mounts', 'event')
				const span = document.createElement('span')
				span.dataset.testid = `custom-slot-event-${ctx.event.id}`
				span.textContent = `[Slot] ${ctx.event.title}`
				host.appendChild(span)
				return {
					update: (next) => {
						bump('updates', 'event')
						span.textContent = `[Slot] ${next.event.title}`
					},
					destroy: () => {
						bump('destroys', 'event')
						span.remove()
					},
				}
			},
		},
		resource: {
			mount: (host, ctx) => {
				bump('mounts', 'resource')
				const span = document.createElement('span')
				span.dataset.testid = `custom-slot-resource-${ctx.resource.id}`
				span.textContent = `Res:${ctx.resource.title}`
				host.appendChild(span)
				return {
					update: (next) => {
						bump('updates', 'resource')
						span.textContent = `Res:${next.resource.title}`
					},
					destroy: () => {
						bump('destroys', 'resource')
						span.remove()
					},
				}
			},
		},
		eventForm: {
			mount: (host, ctx) => {
				bump('mounts', 'eventForm')
				let currentCtx = ctx
				const panel = document.createElement('div')
				panel.dataset.testid = 'custom-slot-event-form'
				const input = document.createElement('input')
				input.dataset.testid = 'custom-slot-form-title'
				const saveBtn = document.createElement('button')
				saveBtn.type = 'button'
				saveBtn.dataset.testid = 'custom-slot-form-save'
				saveBtn.textContent = 'Save Custom'
				saveBtn.addEventListener('click', () => {
					currentCtx.onAdd({
						id: 'slot-created-1',
						title: input.value || 'Custom Slot Event',
						start: currentCtx.initialStart,
						end: currentCtx.initialEnd,
						allDay: currentCtx.initialAllDay,
						resourceId: currentCtx.initialResourceId,
					})
					currentCtx.onClose()
				})
				const sync = (next: typeof ctx) => {
					currentCtx = next
					panel.style.display = next.open ? 'block' : 'none'
					if (next.open) {
						input.value = next.event?.title ?? 'Custom Slot Event'
					}
				}
				panel.append(input, saveBtn)
				host.appendChild(panel)
				sync(ctx)
				return {
					update: (next) => {
						bump('updates', 'eventForm')
						sync(next)
					},
					destroy: () => {
						bump('destroys', 'eventForm')
						panel.remove()
					},
				}
			},
		},
		moreEventsDialog: {
			mount: (host, ctx) => {
				bump('mounts', 'moreEventsDialog')
				const box = document.createElement('div')
				box.dataset.testid = 'custom-slot-more-dialog'
				const sync = (next: typeof ctx) => {
					box.style.display = next.open ? 'block' : 'none'
					box.textContent = `More:${next.events.length}`
				}
				host.appendChild(box)
				sync(ctx)
				return {
					update: (next) => {
						bump('updates', 'moreEventsDialog')
						sync(next)
					},
					destroy: () => {
						bump('destroys', 'moreEventsDialog')
						box.remove()
					},
				}
			},
		},
		recurrenceScopeDialog: {
			mount: (host, ctx) => {
				bump('mounts', 'recurrenceScopeDialog')
				const box = document.createElement('div')
				box.dataset.testid = 'custom-slot-scope-dialog'
				const sync = (next: typeof ctx) => {
					box.style.display = next.open ? 'block' : 'none'
					box.textContent = `Scope:${next.operation}`
				}
				host.appendChild(box)
				sync(ctx)
				return {
					update: (next) => {
						bump('updates', 'recurrenceScopeDialog')
						sync(next)
					},
					destroy: () => {
						bump('destroys', 'recurrenceScopeDialog')
						box.remove()
					},
				}
			},
		},
	}
}

export const MATRIX_STYLEX_SLOT_PROPS: CalendarSlotProps = {
	root: {
		style: {
			'--ilamy-bg': '#ffffff',
			'--ilamy-fg': '#0f172a',
			'--ilamy-surface': '#f8fafc',
			'--ilamy-muted': '#f1f5f9',
			'--ilamy-muted-fg': '#64748b',
			'--ilamy-border': '#e2e8f0',
			'--ilamy-primary': '#2563eb',
			'--ilamy-primary-fg': '#ffffff',
			'--ilamy-danger': '#ef4444',
			'--ilamy-radius': '8px',
			'--ilamy-font': 'system-ui, -apple-system, sans-serif',
			colorScheme: 'light',
		},
	},
}

interface MountedHandle {
	update: (next: DomCalendarOptions) => void
	destroy: () => void
}

async function mountFrameworkRuntime(
	framework: Exclude<HarnessFramework, 'react'>,
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

export interface MatrixFrameworkHarnessProps {
	config?: Partial<UrlConfig>
	css?: HarnessCss
	date: string
	framework: Exclude<HarnessFramework, 'react'>
	height?: string
	logsSelections?: boolean
	onRecordSelection?: (selection: CellInfo) => void
	orientation?: 'vertical' | 'horizontal'
	plugins?: readonly CalendarPlugin[]
	resources?: Resource[]
	scenario: Scenario
	timezone?: string
	view: ViewName
	toPublishedRow: (event: CalendarEvent) => PublishedRow
}

/**
 * Mounts Vue, Svelte, Solid, or Angular adapters inside the E2E harness using the
 * exact same URL query parameters and published JSON outputs as React.
 */
export function MatrixFrameworkHarness({
	config,
	css,
	date,
	framework,
	height,
	logsSelections,
	onRecordSelection,
	orientation,
	plugins,
	resources,
	scenario,
	timezone,
	view,
	toPublishedRow,
}: MatrixFrameworkHarnessProps) {
	const hostRef = useRef<HTMLDivElement | null>(null)
	const handleRef = useRef<MountedHandle | null>(null)
	const [events, setEvents] = useState<CalendarEvent[]>(() => [
		...scenario.events,
	])
	const [changes, setChanges] = useState<PublishedChange[]>([])
	const customSlots = useMemo(
		() => (config?.slots === 'custom' ? createCustomMatrixSlots() : undefined),
		[config?.slots]
	)

	const resolvedPlugins = useMemo<readonly CalendarPlugin[]>(
		() =>
			plugins ?? [
				agendaPlugin({ window: 'week' }),
				yearPlugin(),
				dragToCreatePlugin(
					logsSelections ? { onSelect: onRecordSelection } : undefined
				),
			],
		[plugins, logsSelections, onRecordSelection]
	)

	const options = useMemo<DomCalendarOptions>(
		() => ({
			events,
			resources,
			initialView: view,
			initialDate: date,
			timezone,
			orientation,
			slotDuration: config?.slotDuration,
			snapDuration: config?.snapDuration,
			scrollTime: config?.scrollTime,
			scrollToNow: config?.scrollToNow,
			allDaySlot: config?.allDaySlot,
			nowIndicator: config?.nowIndicator,
			weekNumbers: config?.weekNumbers,
			weekNumberCalculation: config?.weekNumberCalculation,
			dayMaxEvents: config?.dayMaxEvents,
			slotMinTime: config?.slotMinTime,
			slotMaxTime: config?.slotMaxTime,
			stickyViewHeader: config?.stickyViewHeader,
			firstDayOfWeek: config?.firstDayOfWeek,
			hiddenDays: config?.hiddenDays,
			weekends: config?.weekends,
			weekViewGranularity: config?.weekViewGranularity,
			businessHours: config?.businessHours,
			hideNonBusinessHours: config?.hideNonBusinessHours,
			eventConstraint: config?.eventConstraint,
			selectConstraint: config?.selectConstraint,
			editable: config?.editable,
			eventStartEditable: config?.eventStartEditable,
			eventDurationEditable: config?.eventDurationEditable,
			eventResizableFromStart: config?.eventResizableFromStart,
			eventAllow: config?.eventAllow,
			timeFormat: config?.timeFormat,
			locale: config?.locale,
			slotHeaderFormat: config?.slotHeaderFormat,
			eventTimeFormat: config?.eventTimeFormat,
			dayHeaderFormat: config?.dayHeaderFormat,
			titleFormat: config?.titleFormat,
			displayEventTime: config?.displayEventTime,
			displayEventEnd: config?.displayEventEnd,
			translations: config?.translations,
			plugins: resolvedPlugins,
			unstyled: css === 'unstyled',
			slotProps: css === 'stylex' ? MATRIX_STYLEX_SLOT_PROPS : undefined,
			slots: config?.slots === 'custom' ? customSlots : undefined,
			onEventAdd: (added) => setEvents((curr) => [...curr, added]),
			onEventUpdate: (updated) =>
				setEvents((curr) =>
					curr.map((row) => (row.id === updated.id ? updated : row))
				),
			onEventDelete: (deleted) =>
				setEvents((curr) => curr.filter((row) => row.id !== deleted.id)),
			onEventsChange: (change: EventsChange) => {
				const toIds = (rows: CalendarEvent[]) =>
					rows.map((row) => String(row.id))
				setChanges((curr) => [
					...curr,
					{
						action: change.action,
						scope: typeof change.scope === 'string' ? change.scope : null,
						event: String(change.event.id),
						added: toIds(change.added),
						updated: toIds(change.updated),
						deleted: toIds(change.deleted),
						delta: change.delta ?? null,
						endDelta: change.endDelta ?? null,
					},
				])
			},
		}),
		[
			config,
			css,
			customSlots,
			date,
			events,
			orientation,
			resolvedPlugins,
			resources,
			timezone,
			view,
		]
	)

	const latestOptionsRef = useRef(options)
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

	const published = events.map(toPublishedRow)

	return (
		<div
			data-css={css ?? 'tailwind'}
			data-framework={framework}
			data-testid="harness"
			style={{ height: height ?? '100vh', width: '100vw' }}
		>
			<div
				data-testid="calendar-stage"
				ref={hostRef}
				style={{ height: '100%', width: '100%' }}
			/>
			<script data-testid="event-state" type="application/json">
				{JSON.stringify(published)}
			</script>
			<script data-testid="event-changes" type="application/json">
				{JSON.stringify(changes)}
			</script>
		</div>
	)
}
