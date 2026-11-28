import '@ilamy/calendar/styles.css'
import type {
	CalendarEvent,
	CalendarView,
	DomCalendarEventInput,
	EventsChange,
	MountedCalendar,
	Resource,
} from '@ilamy/calendar'
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import { yearPlugin } from '@ilamy/calendar/plugins/year'

interface ZeroTwWindow extends Window {
	__zeroTwChanges?: Array<{
		action: string
		id: string
		title: string
		start: string
		end: string
	}>
	__zeroTwCal?: MountedCalendar
}

const params = new URLSearchParams(window.location.search)
const isFlag = (key: string) =>
	params.get(key) === '1' || params.get(key) === 'true'
const framework = params.get('framework') ?? 'svelte'

if (isFlag('dark')) {
	document.documentElement.classList.add('dark')
}

const host = document.querySelector<HTMLElement>('#calendar-host')
if (!host) {
	throw new Error('#calendar-host missing')
}
const rootHost: HTMLElement = host

const resources: Resource[] | undefined = isFlag('resources')
	? [
			{
				id: 'room-a',
				title: 'Room A',
				backgroundColor: '#dbeafe',
				color: '#1e3a8a',
			},
			{
				id: 'room-b',
				title: 'Room B',
				backgroundColor: '#dcfce7',
				color: '#166534',
			},
			{
				id: 'room-c',
				title: 'Room C',
				backgroundColor: '#fef3c7',
				color: '#92400e',
			},
		]
	: undefined

const seedEvents: DomCalendarEventInput[] = [
	{
		id: 'ztw-1',
		title: 'Standalone Keynote',
		start: '2026-11-19T09:00:00Z',
		end: '2026-11-19T11:00:00Z',
		resourceId: 'room-a',
	},
	{
		id: 'ztw-span',
		title: 'Multi-Week Sprint',
		start: '2026-11-13T00:00:00Z',
		end: '2026-11-17T00:00:00Z',
		allDay: true,
		resourceId: 'room-b',
	},
	{
		id: 'ztw-early',
		title: 'Morning Standup',
		start: '2026-11-19T08:00:00Z',
		end: '2026-11-19T09:00:00Z',
		resourceId: 'room-a',
	},
]

const win = window as ZeroTwWindow
win.__zeroTwChanges = []

const commonOptions = {
	initialDate: params.get('date') ?? '2026-11-19T09:00:00Z',
	initialView: (params.get('view') as CalendarView | null) ?? 'month',
	timezone: 'UTC',
	events: seedEvents as CalendarEvent[],
	resources,
	orientation:
		(params.get('orientation') as 'horizontal' | 'vertical' | null) ??
		'horizontal',
	weekViewGranularity:
		(params.get('granularity') as 'hourly' | 'daily' | null) ?? 'hourly',
	unstyled: isFlag('unstyled'),
	editable: params.has('editable') ? isFlag('editable') : true,
	eventResizableFromStart: isFlag('resizableFromStart'),
	plugins: [
		agendaPlugin({ window: 'week' }),
		yearPlugin(),
		dragToCreatePlugin(),
		recurrencePlugin(),
	],
	dayMaxEvents: 3,
	onEventsChange: (change: EventsChange) => {
		win.__zeroTwChanges?.push({
			action: change.action,
			id: String(change.event.id),
			title: change.event.title,
			start: change.event.start,
			end: change.event.end,
		})
	},
}

const renderError = (msg: string) => {
	const err = document.createElement('div')
	err.dataset.testid = 'harness-error'
	err.textContent = msg
	rootHost.appendChild(err)
}

async function mountForFramework() {
	if (framework === 'svelte') {
		const { mountIlamyCalendar } = await import('@ilamy/calendar/svelte')
		win.__zeroTwCal = mountIlamyCalendar(rootHost, commonOptions)
		return
	}
	if (framework === 'react') {
		const [{ createElement }, { createRoot }, { IlamyCalendar }] =
			await Promise.all([
				import('react'),
				import('react-dom/client'),
				import('@ilamy/calendar/react'),
			])
		createRoot(rootHost).render(createElement(IlamyCalendar, commonOptions))
		return
	}
	if (framework === 'vue') {
		const [{ createApp, h }, { IlamyCalendar }] = await Promise.all([
			import('vue'),
			import('@ilamy/calendar/vue'),
		])
		createApp({
			setup: () => () => h(IlamyCalendar, { options: commonOptions }),
		}).mount(rootHost)
		return
	}
	if (framework === 'solid') {
		const [{ createRoot }, { mountSolidCalendar }] = await Promise.all([
			import('solid-js'),
			import('@ilamy/calendar/solid'),
		])
		createRoot(() => {
			mountSolidCalendar(rootHost, commonOptions)
		})
		return
	}
	if (framework === 'angular') {
		const { registerIlamyCalendarElement } =
			await import('@ilamy/calendar/angular')
		registerIlamyCalendarElement()
		const el = document.createElement('ilamy-calendar') as HTMLElement & {
			options: typeof commonOptions
		}
		el.options = commonOptions
		rootHost.appendChild(el)
		return
	}
	renderError(`Unknown framework: ${framework}`)
}

void mountForFramework()
