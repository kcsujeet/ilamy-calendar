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
import { createEffect } from 'solid-js'
import { createSolidSlotMount } from '@ilamy/calendar/solid'
import type { HarnessCss, HarnessFramework, UrlConfig } from './harness-config'
import type { PublishedChange, PublishedRow } from './published-change'
import type { Scenario, ViewName } from './scenarios'

interface SlotCounterState {
	mounts: Record<string, number>
	updates: Record<string, number>
	destroys: Record<string, number>
}

const buildSlotDomHelper = (
	bump: (b: keyof SlotCounterState, k: string) => void
) => {
	const makeHeader = (ctx: import('@ilamy/calendar').HeaderSlotContext) => {
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
		return { wrap, title }
	}
	return { makeHeader }
}

const createCustomMatrixSlots = (
	framework: Exclude<HarnessFramework, 'react'>
): CalendarSlots => {
	const win = window as unknown as { __matrixSlotCounts?: SlotCounterState }
	const getCounts = (): SlotCounterState => {
		win.__matrixSlotCounts ??= { mounts: {}, updates: {}, destroys: {} }
		return win.__matrixSlotCounts
	}
	const bump = (bucketName: keyof SlotCounterState, key: string) => {
		const bucket = getCounts()[bucketName]
		bucket[key] = (bucket[key] ?? 0) + 1
	}

	if (framework === 'solid') {
		const base = createImperativeMatrixSlots(bump)
		const { makeHeader } = buildSlotDomHelper(bump)
		return {
			...base,
			header: createSolidSlotMount<import('@ilamy/calendar').HeaderSlotContext>(
				(ctx) => {
					const { wrap, title } = makeHeader(ctx())
					let first = true
					createEffect(
						() => ctx(),
						(next) => {
							if (first) {
								first = false
								return
							}
							bump('updates', 'header')
							title.textContent = next.title
						}
					)
					return wrap
				}
			),
		}
	}

	return createImperativeMatrixSlots(bump)
}

const createImperativeMatrixSlots = (
	bump: (bucketName: keyof SlotCounterState, key: string) => void
): CalendarSlots => {
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

export const MATRIX_MUI_VARS_SLOT_PROPS: CalendarSlotProps = {
	root: {
		style: {
			'--ilamy-bg': '#ffffff',
			'--ilamy-fg': '#1a1a1a',
			'--ilamy-surface': '#fafafa',
			'--ilamy-muted': '#f5f5f5',
			'--ilamy-muted-fg': '#666666',
			'--ilamy-border': 'rgba(0, 0, 0, 0.12)',
			'--ilamy-primary': '#1976d2',
			'--ilamy-primary-fg': '#ffffff',
			'--ilamy-danger': '#d32f2f',
			'--ilamy-radius': '4px',
			'--ilamy-font': 'Roboto, Helvetica, Arial, sans-serif',
			colorScheme: 'light',
		},
	},
}

export const MATRIX_TAILWIND_SLOT_PROPS: CalendarSlotProps = {
	root: {
		className: [
			'bg-background text-foreground text-[14px] leading-[1.4]',
			"[&_[data-ilamy-slot='arrow-group']]:bg-background [&_[data-ilamy-slot='arrow-group']]:border [&_[data-ilamy-slot='arrow-group']]:border-border [&_[data-ilamy-slot='arrow-group']]:rounded-md",
			"[&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:border-0 [&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:rounded-none [&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:px-2.5",
			"[&_[data-ilamy-slot='view-switcher']]:bg-muted [&_[data-ilamy-slot='view-switcher']]:rounded-md [&_[data-ilamy-slot='view-switcher']]:p-[3px]",
			"[&_[data-ilamy-slot='month-header']]:bg-background [&_[data-ilamy-slot='month-header']]:border-b [&_[data-ilamy-slot='month-header']]:border-border",
			"[&_[data-ilamy-slot='grid-header']]:bg-background [&_[data-ilamy-slot='grid-header']:not(:has([data-ilamy-part='all-day-row']))]:border-b [&_[data-ilamy-slot='grid-header']:not(:has([data-ilamy-part='all-day-row']))]:border-border",
			"[&_[data-ilamy-part='all-day-row']]:border-t [&_[data-ilamy-part='all-day-row']]:border-b [&_[data-ilamy-part='all-day-row']]:border-border [&_[data-ilamy-part='all-day-label']]:bg-background [&_[data-ilamy-part='all-day-label']]:text-muted-foreground [&_[data-ilamy-part='all-day-label']]:border-r [&_[data-ilamy-part='all-day-label']]:border-border [&_[data-ilamy-part='all-day-label']]:text-xs",
			"[&_[data-ilamy-part='all-day-cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='all-day-cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='col-header-label']]:leading-6 [&_[data-ilamy-today-badge]]:inline-flex [&_[data-ilamy-today-badge]]:items-center [&_[data-ilamy-today-badge]]:justify-center [&_[data-ilamy-today-badge]]:min-w-6 [&_[data-ilamy-today-badge]]:h-6 [&_[data-ilamy-today-badge]]:px-1.5 [&_[data-ilamy-today-badge]]:rounded-full [&_[data-ilamy-today-badge]]:bg-primary [&_[data-ilamy-today-badge]]:text-primary-foreground [&_[data-ilamy-today-badge]]:text-xs [&_[data-ilamy-today-badge]]:font-semibold",
			"[&_[data-ilamy-part='cell-day-num']]:text-xs [&_[data-ilamy-part='cell-day-num']]:font-medium [&_[data-ilamy-part='cell-day-num']]:rounded-full",
			"[&_[data-ilamy-part='header-corner']]:bg-background [&_[data-ilamy-part='header-corner']]:text-muted-foreground [&_[data-ilamy-part='header-corner']]:border-r [&_[data-ilamy-part='header-corner']]:border-border [&_[data-ilamy-part='header-corner']]:p-2 [&_[data-ilamy-part='header-corner']]:text-xs [&_[data-ilamy-part='header-corner']]:font-medium",
			"[&_[data-ilamy-part='time-col-header']]:bg-background [&_[data-ilamy-part='time-col-header']]:px-1 [&_[data-ilamy-part='time-col-header']]:py-2 [&_[data-ilamy-part='time-col-header']]:text-xs [&_[data-ilamy-part='time-col-header']]:font-medium [&_[data-ilamy-part='time-col-header']]:text-muted-foreground [&_[data-ilamy-part='time-col-header']:not(:last-child)]:border-r [&_[data-ilamy-part='time-col-header']:not(:last-child)]:border-border",
			"[&_[data-ilamy-part='day-banner']]:bg-background [&_[data-ilamy-part='day-banner']]:border-b [&_[data-ilamy-part='day-banner']]:border-border [&_[data-ilamy-part='day-banner']]:px-3 [&_[data-ilamy-part='day-banner']]:py-2.5 [&_[data-ilamy-part='day-banner']]:text-base [&_[data-ilamy-part='day-banner']]:font-semibold",
			"[&_[data-ilamy-part='time-axis']]:bg-background [&_[data-ilamy-part='time-axis']]:border-r [&_[data-ilamy-part='time-axis']]:border-border",
			"[&_[data-ilamy-part='time-axis-hour']]:text-muted-foreground [&_[data-ilamy-part='time-axis-hour']]:text-[11px] [&_[data-ilamy-part='time-axis-hour']]:border-b [&_[data-ilamy-part='time-axis-hour']]:border-border/60",
			"[&_[data-ilamy-part='time-col']:not(:last-child)]:border-r [&_[data-ilamy-part='time-col']:not(:last-child)]:border-border",
			"[&_[data-ilamy-part='res-h-day-group']]:bg-background [&_[data-ilamy-part='res-h-day-group']]:border-b [&_[data-ilamy-part='res-h-day-group']]:border-border [&_[data-ilamy-part='res-h-day-group']]:py-1.5 [&_[data-ilamy-part='res-h-day-group']]:text-xs [&_[data-ilamy-part='res-h-day-group']]:font-medium [&_[data-ilamy-part='res-h-day-group']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-day-group']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='res-h-hour-cell']]:bg-background [&_[data-ilamy-part='res-h-hour-cell']]:text-muted-foreground [&_[data-ilamy-part='res-h-hour-cell']]:py-2 [&_[data-ilamy-part='res-h-hour-cell']]:text-xs [&_[data-ilamy-part='res-h-hour-cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-hour-cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='view-menu-dropdown']]:bg-background [&_[data-ilamy-part='view-menu-dropdown']]:text-foreground [&_[data-ilamy-part='view-menu-dropdown']]:border [&_[data-ilamy-part='view-menu-dropdown']]:border-border [&_[data-ilamy-part='view-menu-dropdown']]:rounded-md [&_[data-ilamy-part='view-menu-dropdown']]:p-1 [&_[data-ilamy-part='view-menu-dropdown']]:shadow-lg",
			"[&_[data-ilamy-part='view-menu-item']]:px-2.5 [&_[data-ilamy-part='view-menu-item']]:py-1.5 [&_[data-ilamy-part='view-menu-item']]:rounded-sm [&_[data-ilamy-part='view-menu-item']]:text-sm [&_[data-ilamy-part='view-menu-item']]:font-medium hover:[&_[data-ilamy-part='view-menu-item']]:bg-muted",
			"[&_[data-ilamy-part='year-card']]:bg-card [&_[data-ilamy-part='year-card']]:border [&_[data-ilamy-part='year-card']]:border-border [&_[data-ilamy-part='year-card']]:rounded-lg [&_[data-ilamy-part='year-card']]:p-3",
			"[&_[data-ilamy-part='agenda-day']]:border-b [&_[data-ilamy-part='agenda-day']]:border-border [&_[data-ilamy-part='agenda-day']]:px-2 [&_[data-ilamy-part='agenda-day']]:py-3",
		].join(' '),
	},
	header: { className: 'bg-background' },
	navButton: {
		className:
			'bg-background text-foreground border border-border rounded-md px-3 text-sm leading-5 font-medium hover:bg-muted data-[variant=primary]:bg-primary data-[variant=primary]:text-primary-foreground data-[variant=primary]:border-transparent',
	},
	viewButton: {
		className:
			'bg-transparent text-muted-foreground border-0 rounded-sm px-3 text-sm leading-5 font-medium',
	},
	viewButtonActive: {
		className:
			'bg-background text-foreground border-0 rounded-sm px-3 text-sm leading-5 font-medium shadow-xs',
	},
	grid: {
		className: [
			'bg-background border border-border rounded-none',
			"[&_[data-ilamy-slot='grid-row']>[data-ilamy-slot='cell']]:p-1 [&_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:p-1",
			"[&_[data-ilamy-slot='grid-row']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-slot='grid-row']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='grid-row-grid']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='grid-row-grid']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-slot='grid-row']:not(:last-child)>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-slot='grid-row']:not(:last-child)>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='month-row']:not(:last-child)_[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='month-row']:not(:last-child)_[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-row='true'])]:border-b [&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-row='true'])]:border-border/35",
			"[&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell'][data-hour-end='true']:not(:last-child):not([data-last-row='true'])]:border-b [&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell'][data-hour-end='true']:not(:last-child):not([data-last-row='true'])]:border-border/80",
		].join(' '),
	},
	dayHeader: {
		className:
			"bg-background text-foreground py-2 text-sm leading-5 font-medium [&:not(:last-child):not([data-last-col='true'])]:border-r [&:not(:last-child):not([data-last-col='true'])]:border-border",
	},
	resourceHeader: {
		className:
			"bg-background text-foreground px-2.5 py-2 text-sm font-medium border-r border-border [&:not([data-ilamy-part='header-corner'])]:border-b [&:not([data-ilamy-part='header-corner'])]:border-border",
	},
	cell: {
		className:
			"bg-background [&[data-outside-month='true']]:bg-muted/35 [&[data-outside-month='true']]:text-muted-foreground",
	},
	cellToday: { className: 'bg-background' },
	cellNonBusiness: { className: 'bg-muted/55 text-muted-foreground' },
	cellDisabled: {
		className: 'bg-muted text-muted-foreground opacity-55 cursor-not-allowed',
	},
	allDayRow: { className: 'bg-background' },
	eventBar: {
		className:
			"rounded-sm text-xs font-medium [&:not([data-custom-color='true'])]:bg-primary [&:not([data-custom-color='true'])]:text-primary-foreground [&[data-truncated-start='true']]:rounded-l-none [&[data-truncated-end='true']]:rounded-r-none [&>[data-ilamy-part='event-bar-content']]:px-1.5 [&>[data-ilamy-part='event-bar-content']]:py-1 [&[data-compact='true']>[data-ilamy-part='event-bar-content']]:py-0 [&>[data-ilamy-part='event-bar-content']]:border [&>[data-ilamy-part='event-bar-content']]:border-card [&>[data-ilamy-part='event-bar-content']]:rounded-inherit",
	},
	nowIndicator: {
		className:
			"text-destructive [&>[data-ilamy-part='now-line-dot']]:size-2 [&>[data-ilamy-part='now-line-dot']]:rounded-full [&>[data-ilamy-part='now-line-dot']]:bg-destructive [&>[data-ilamy-part='now-line-bar']]:h-0.5 [&>[data-ilamy-part='now-line-bar']]:flex-1 [&>[data-ilamy-part='now-line-bar']]:bg-destructive",
	},
	moreLink: {
		className:
			'text-muted-foreground text-xs font-medium px-1.5 py-0.5 hover:text-foreground',
	},
}

const resolveMatrixSlotProps = (
	css: HarnessCss | undefined,
	themeVariant: UrlConfig['themeVariant']
): CalendarSlotProps | undefined => {
	if (themeVariant === 'mui-vars') return MATRIX_MUI_VARS_SLOT_PROPS
	if (css === 'stylex') return MATRIX_STYLEX_SLOT_PROPS
	if (css === 'tailwind') return MATRIX_TAILWIND_SLOT_PROPS
	return undefined
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
		() =>
			config?.slots === 'custom'
				? createCustomMatrixSlots(framework)
				: undefined,
		[config?.slots, framework]
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
			unstyled: css === 'unstyled' || css === 'tailwind',
			slotProps: resolveMatrixSlotProps(css, config?.themeVariant),
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
			data-css={css ?? 'plain'}
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
