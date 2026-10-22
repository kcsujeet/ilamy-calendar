import {
	type CalendarEvent,
	type CellInfo,
	dayjs,
	type EventsChange,
	type EventsFetchInfo,
	IlamyCalendar,
	type IlamyCalendarApi,
	type IlamyPlugin,
	type Resource,
	useIlamyCalendarContext,
} from '@ilamy/calendar'
// A dayjs locale is data the consumer registers (docs/migration-v2.md), so the
// harness registers the ones its specs name with `locale=`.
import 'dayjs/locale/ar.js'
import 'dayjs/locale/de.js'
import 'dayjs/locale/fr.js'
import { agendaPlugin } from '@ilamy/calendar-agenda'
import { dragToCreatePlugin } from '@ilamy/calendar-drag-to-create'
import { recurrencePlugin } from '@ilamy/calendar-recurrence'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { ConfigError, readUrlConfig } from './harness-config'
import type {
	PublishedChange,
	PublishedFetch,
	PublishedRow,
} from './published-change'
import {
	isScenarioName,
	PINNED_NOW,
	type Scenario,
	scenarios,
	type ViewName,
} from './scenarios'
import { readSeededEvents } from './seed'

const VIEWS: readonly ViewName[] = ['day', 'week', 'month', 'year', 'agenda']

/*
 * Plugins are opt-in per URL rather than always on. `agenda` adds a view, and a
 * view that is only present sometimes is exactly the kind of thing that should
 * be stated in the URL rather than assumed: `?view=agenda` without
 * `&plugins=agenda` renders nothing, and the harness says so.
 */
const PLUGINS = {
	agenda: agendaPlugin,
	recurrence: recurrencePlugin,
	'drag-to-create': dragToCreatePlugin,
} as const

type PluginName = keyof typeof PLUGINS

interface LoggedSelection {
	start: string
	end: string
	allDay: boolean | null
	resourceId: string | number | null
}

const recordSelection = (selection: CellInfo): void => {
	const logged = window as unknown as { __selectLog?: LoggedSelection[] }
	logged.__selectLog = [
		...(logged.__selectLog ?? []),
		{
			start: selection.start.toISOString(),
			end: selection.end.toISOString(),
			allDay: selection.allDay ?? null,
			resourceId: selection.resource?.id ?? null,
		},
	]
}

const isPluginName = (value: string): value is PluginName =>
	Object.hasOwn(PLUGINS, value)

const isViewName = (value: string): value is ViewName =>
	VIEWS.includes(value as ViewName)

type Orientation = 'vertical' | 'horizontal'

const isOrientation = (value: string): value is Orientation =>
	value === 'vertical' || value === 'horizontal'

/**
 * The harness reads its entire configuration from the URL, so a test — or an
 * agent — reaches any state by navigating rather than by clicking through
 * setup. When setup is clicks, a failure is ambiguous: it could be the setup
 * that broke rather than the thing under test.
 *
 * A scenario supplies the events; every setting is a query parameter. There are
 * far more combinations of settings than anyone would write fixtures for, and
 * this way none have to be written.
 *
 * Unknown values fail loudly. A silent fallback to a default would make a typo
 * look like a passing test of a screen nobody asked for, which is exactly how
 * the view harnesses in #270 went wrong.
 *
 * The URL is re-read on `popstate`, so a spec can change a setting on a
 * calendar that is already mounted (`setSettings` in the test support). That is
 * how a consumer changing a prop at runtime looks, and a fresh navigation can
 * never reproduce it: the calendar would mount with the new value instead.
 */
const toPublishedRow = (event: CalendarEvent): PublishedRow => {
	const rule = event.rrule
	return {
		id: String(event.id),
		uid: event.uid ?? null,
		title: event.title,
		start: event.start.toISOString(),
		end: event.end.toISOString(),
		resourceId: event.resourceId ?? null,
		resourceIds: event.resourceIds ?? null,
		allDay: Boolean(event.allDay),
		recurrenceId: event.recurrenceId ?? null,
		exdates: event.exdates ?? null,
		rrule: rule
			? {
					freq: rule.freq,
					interval: rule.interval ?? null,
					count: rule.count ?? null,
					until: rule.until ? rule.until.toISOString() : null,
					dtstart: rule.dtstart.toISOString(),
					byweekday: rule.byweekday
						? [rule.byweekday].flat().map((day) => String(day))
						: null,
					bymonthday: rule.bymonthday ?? null,
					bymonth: rule.bymonth ?? null,
				}
			: null,
	}
}

export const App = () => {
	const search = useLocationSearch()
	const params = new URLSearchParams(search)

	const scenarioName = params.get('scenario') ?? 'basic'
	const viewName = params.get('view') ?? 'month'
	const orientation = params.get('orientation')
	const timezoneParam = params.get('tz') ?? 'UTC'
	// `tz=none` leaves the calendar's `timezone` prop unset.
	const timezone = timezoneParam === 'none' ? undefined : timezoneParam
	const date = params.get('date') ?? PINNED_NOW

	if (!isScenarioName(scenarioName)) {
		return <Problem>Unknown scenario: {scenarioName}</Problem>
	}
	if (!isViewName(viewName)) {
		return <Problem>Unknown view: {viewName}</Problem>
	}
	if (orientation !== null && !isOrientation(orientation)) {
		return <Problem>Unknown orientation: {orientation}</Problem>
	}

	// Widened from the `as const` literal so optional keys are readable here.
	const requested = params.get('plugins')
	const pluginNames = requested ? requested.split(',').filter(Boolean) : []
	const unknownPlugin = pluginNames.find((name) => !isPluginName(name))
	if (unknownPlugin !== undefined) {
		return <Problem>Unknown plugin: {unknownPlugin}</Problem>
	}
	// Widened from the `as const` literal so optional keys are readable here.
	const seed = params.get('seed')
	const scenario: Scenario = seed
		? { ...scenarios[scenarioName], events: readSeededEvents(seed) }
		: scenarios[scenarioName]

	let urlConfig: ReturnType<typeof readUrlConfig>
	try {
		urlConfig = readUrlConfig(params)
	} catch (error) {
		if (error instanceof ConfigError) {
			return <Problem>{error.message}</Problem>
		}
		throw error
	}

	// `onSelect=log` records what drag-to-create hands a consumer's `onSelect`
	// in `window.__selectLog`, so a spec can read the CellInfo it reports.
	const logsSelections = params.get('onSelect') === 'log'
	const plugins: IlamyPlugin[] = pluginNames
		.filter(isPluginName)
		.map((name) => {
			if (name === 'drag-to-create' && logsSelections) {
				return dragToCreatePlugin({ onSelect: recordSelection })
			}
			if (name === 'agenda') {
				return agendaPlugin({ window: urlConfig.agendaWindow })
			}
			return PLUGINS[name]()
		})

	// The URL wins over the scenario's own settings, so a fixture can be pushed
	// into a configuration it was not written for without editing it.
	const {
		height,
		renderEventVariant,
		resourceCount,
		revertChanges,
		externalToolbar,
		fetch,
		fetchDelay,
		resourcesFetch,
		agendaWindow: _agendaWindow,
		...calendarConfig
	} = {
		...scenario.config,
		...urlConfig,
	}
	const resources = scenario.resources?.slice(0, resourceCount)

	return (
		<Harness
			config={calendarConfig}
			date={date}
			externalToolbar={externalToolbar}
			fetchDelay={fetchDelay}
			fetchMode={fetch}
			height={height}
			orientation={orientation ?? undefined}
			plugins={plugins}
			renderEventVariant={renderEventVariant}
			resources={resources}
			resourcesFetchMode={resourcesFetch}
			revertChanges={revertChanges}
			scenario={scenario}
			timezone={timezone}
			view={viewName}
		/>
	)
}

const useLocationSearch = (): string => {
	const [search, setSearch] = useState(window.location.search)

	useEffect(() => {
		const handlePopState = () => setSearch(window.location.search)
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [])

	return search
}

type HarnessOnly =
	| 'height'
	| 'renderEventVariant'
	| 'revertChanges'
	| 'externalToolbar'
	| 'fetch'
	| 'fetchDelay'
	| 'agendaWindow'

type FetchMode = 'delayed' | 'failing' | 'held'

/** How often a held fetch checks whether its mode was changed to release it. */
const HELD_POLL_MS = 25

interface HarnessProps {
	config: Omit<ReturnType<typeof readUrlConfig>, HarnessOnly>
	date: string
	externalToolbar?: boolean
	fetchDelay?: number
	fetchMode?: FetchMode
	resourcesFetchMode?: FetchMode
	renderEventVariant?: ReturnType<typeof readUrlConfig>['renderEventVariant']
	height?: string
	orientation?: Orientation
	plugins: IlamyPlugin[]
	resources?: Resource[]
	revertChanges?: boolean
	scenario: Scenario
	timezone?: string
	view: ViewName
}

/**
 * Holds the events so mutations stick, and publishes what the calendar reports
 * back as JSON.
 *
 * A drag cannot be asserted from the DOM alone: in the month grid the bars live
 * in an overlay positioned over the cells rather than inside them, so "is this
 * event in Thursday's cell" has no element to ask. Reading the state the
 * calendar hands its consumer is both easier to assert and closer to what a
 * consumer actually depends on.
 */
const Harness: React.FC<HarnessProps> = ({
	config,
	date,
	externalToolbar,
	fetchDelay = 0,
	fetchMode,
	resourcesFetchMode,
	renderEventVariant,
	height,
	orientation,
	plugins,
	resources,
	revertChanges,
	scenario,
	timezone,
	view,
}) => {
	const calendarRef = useRef<IlamyCalendarApi>(null)
	const [events, setEvents] = useState<CalendarEvent[]>(() => [
		...scenario.events,
	])

	const handleUpdate = (updated: CalendarEvent) => {
		setEvents((current) =>
			current.map((event) => (event.id === updated.id ? updated : event))
		)
	}

	// Adds and deletes are persisted too, the way a consumer that controls
	// `events` must: the calendar resets to the `events` prop whenever it
	// changes, so a row the harness dropped on the floor would come back (#315).
	const handleAdd = (added: CalendarEvent) => {
		setEvents((current) => [...current, added])
	}

	const handleDelete = (deleted: CalendarEvent) => {
		setEvents((current) => current.filter((event) => event.id !== deleted.id))
	}

	// Every onEventsChange call, by row id, so a spec can assert that one user
	// action was reported once (#309).
	const [changes, setChanges] = useState<PublishedChange[]>([])
	const handleChange = (change: EventsChange) => {
		const toIds = (rows: CalendarEvent[]) => rows.map((row) => String(row.id))
		const published: PublishedChange = {
			action: change.action,
			scope: typeof change.scope === 'string' ? change.scope : null,
			event: String(change.event.id),
			added: toIds(change.added),
			updated: toIds(change.updated),
			deleted: toIds(change.deleted),
			delta: change.delta ?? null,
			endDelta: change.endDelta ?? null,
		}
		setChanges((current) => [...current, published])
		if (revertChanges) {
			change.revert()
		}
	}

	// With `fetch` set, `events` is a function that plays the consumer's server:
	// it answers from the rows held above, so a saved edit is what the next fetch
	// returns. Read through a ref so a mounted calendar sees a changed `fetch`.
	const server = useRef({
		events,
		fetchMode,
		resources,
		resourcesFetchMode,
		fetchDelay,
	})
	server.current = {
		events,
		fetchMode,
		resources,
		resourcesFetchMode,
		fetchDelay,
	}
	const [fetchState, setFetchState] = useState({
		isLoading: false,
		errors: 0,
	})
	const [resourceErrors, setResourceErrors] = useState(0)
	const [resourceSets, setResourceSets] = useState<string[][]>([])
	const [fetchLog, fetchFromServer] = useServer(
		() => server.current.fetchMode,
		() => server.current.fetchDelay,
		(info) =>
			// A real server returns every row whose recurrence intersects the
			// range, so a series row always comes back (the harness does not
			// evaluate the rule); a plain row only when it overlaps.
			server.current.events.filter(
				(row) =>
					Boolean(row.rrule) ||
					(row.start.isBefore(info.end) && row.end.isAfter(info.start))
			)
	)
	const [resourcesFetchLog, fetchResourcesFromServer] = useServer(
		() => server.current.resourcesFetchMode,
		() => server.current.fetchDelay,
		() => server.current.resources ?? []
	)

	// A server that rejects every save persists nothing, so the calendar's own
	// rows are the only thing `revert` has to put right.
	const shouldPersistRows = !revertChanges

	const published = events.map(toPublishedRow)

	return (
		<div
			data-testid="harness"
			style={{ height: height ?? '100vh', width: '100vw' }}
		>
			{externalToolbar && <ExternalToolbar calendarRef={calendarRef} />}
			<IlamyCalendar
				{...config}
				events={fetchMode ? fetchFromServer : events}
				initialDate={date}
				initialView={view}
				loading={(isLoading) =>
					setFetchState((state) => ({ ...state, isLoading }))
				}
				onEventAdd={shouldPersistRows ? handleAdd : undefined}
				onEventDelete={shouldPersistRows ? handleDelete : undefined}
				onEventsChange={handleChange}
				onEventsError={() =>
					setFetchState((state) => ({ ...state, errors: state.errors + 1 }))
				}
				onEventUpdate={shouldPersistRows ? handleUpdate : undefined}
				onResourcesError={() => setResourceErrors((count) => count + 1)}
				orientation={orientation}
				plugins={
					resourcesFetchMode ? [...plugins, refetchButtonPlugin] : plugins
				}
				ref={calendarRef}
				renderEvent={
					renderEventVariant === 'sticky-title' ? renderStickyTitle : undefined
				}
				resources={resourcesFetchMode ? fetchResourcesFromServer : resources}
				resourcesSet={(set) =>
					setResourceSets((current) => [
						...current,
						set.map((resource) => String(resource.id)),
					])
				}
				timezone={timezone}
			/>
			{/* Read by the specs, invisible to a screenshot. */}
			<script data-testid="event-state" type="application/json">
				{JSON.stringify(published)}
			</script>
			<script data-testid="event-changes" type="application/json">
				{JSON.stringify(changes)}
			</script>
			<script data-testid="fetch-log" type="application/json">
				{JSON.stringify(fetchLog)}
			</script>
			<script data-testid="resources-fetch-log" type="application/json">
				{JSON.stringify(resourcesFetchLog)}
			</script>
			<script data-testid="resources-errors" type="application/json">
				{JSON.stringify(resourceErrors)}
			</script>
			<script data-testid="resources-set" type="application/json">
				{JSON.stringify(resourceSets)}
			</script>
			<script data-testid="fetch-state" type="application/json">
				{JSON.stringify(fetchState)}
			</script>
		</div>
	)
}

/**
 * Buttons that live outside the calendar and drive it through its `ref`, with
 * the date and view the ref reports printed beside them. The readout is
 * refreshed on click, so it shows what `ref.current` says after the update.
 */
const ExternalToolbar: React.FC<{
	calendarRef: React.RefObject<IlamyCalendarApi | null>
}> = ({ calendarRef }) => {
	const [readout, setReadout] = useState({ date: '', view: '' })
	// The ref is not state, so nothing re-renders this when the calendar moves:
	// poll it, which is also how a consumer would have to read it from outside.
	useEffect(() => {
		const timer = setInterval(() => {
			const api = calendarRef.current
			if (api) {
				setReadout({ date: api.currentDate.toISOString(), view: api.view })
			}
		}, 50)
		return () => clearInterval(timer)
	}, [calendarRef])
	const actions: Record<string, (api: IlamyCalendarApi) => void> = {
		next: (api) => api.nextPeriod(),
		prev: (api) => api.prevPeriod(),
		today: (api) => api.today(),
		goto: (api) => api.setCurrentDate(dayjs('2025-07-04T12:00:00.000Z')),
		week: (api) => api.setView('week'),
		scroll: (api) => api.scrollToTime('13:30'),
		refetch: (api) => api.refetchEvents(),
	}
	return (
		<div data-testid="external-toolbar" style={{ display: 'flex', gap: 4 }}>
			{Object.entries(actions).map(([name, run]) => (
				<button
					data-testid={`external-${name}`}
					key={name}
					onClick={() => {
						if (calendarRef.current) {
							run(calendarRef.current)
						}
					}}
					type="button"
				>
					{name}
				</button>
			))}
			<span data-testid="external-date">{readout.date}</span>
			<span data-testid="external-view">{readout.view}</span>
		</div>
	)
}

/**
 * Plays the consumer's server for one function prop (`events` or `resources`):
 * answers after `fetchDelay` ms, or fails, and logs every call and how it ended.
 * The mode and delay are read on every call, so a spec can change them on a
 * mounted calendar. In `held` mode the answer is not due until the mode changes,
 * so a spec can assert the pending state without racing a timer.
 */
const useServer = <Row,>(
	getMode: () => FetchMode | undefined,
	getDelay: () => number,
	answer: (info: EventsFetchInfo) => Row[]
): [
	PublishedFetch[],
	(info: EventsFetchInfo, options: { signal: AbortSignal }) => Promise<Row[]>,
] => {
	const nextId = useRef(0)
	const [log, setLog] = useState<PublishedFetch[]>([])

	const serve = (
		info: EventsFetchInfo,
		{ signal }: { signal: AbortSignal }
	) => {
		const id = nextId.current
		nextId.current += 1
		const finish = (status: PublishedFetch['status']) =>
			setLog((entries) =>
				entries.map((entry) => (entry.id === id ? { ...entry, status } : entry))
			)
		setLog((entries) => [
			...entries,
			{ id, start: info.startStr, end: info.endStr, status: 'pending' },
		])

		return new Promise<Row[]>((resolve, reject) => {
			const answerWhenDue = () => {
				const mode = getMode()
				if (mode === 'held') {
					timer = setTimeout(answerWhenDue, HELD_POLL_MS)
					return
				}
				if (mode === 'failing') {
					finish('failed')
					reject(new Error('the harness server failed'))
					return
				}
				finish('done')
				resolve(answer(info))
			}
			let timer = setTimeout(answerWhenDue, getDelay())
			signal.addEventListener('abort', () => {
				clearTimeout(timer)
				finish('aborted')
				reject(new DOMException('superseded', 'AbortError'))
			})
		})
	}
	return [log, serve]
}

/** A button that calls `refetchResources()`; the context is only reachable inside the calendar. */
const RefetchResourcesButton = ({
	children,
}: {
	children: React.ReactNode
}) => {
	const { refetchResources } = useIlamyCalendarContext()
	return (
		<>
			{children}
			<button
				data-testid="refetch-resources"
				onClick={refetchResources}
				style={{ position: 'fixed', right: 0, bottom: 0, zIndex: 1000 }}
				type="button"
			>
				refetch resources
			</button>
		</>
	)
}

const refetchButtonPlugin: IlamyPlugin = {
	name: 'harness-refetch-resources',
	provider: RefetchResourcesButton,
}

/**
 * The custom-renderer pattern from the docs: the renderer owns its markup, so
 * it opts its title into sticking by reading the offsets the grid publishes.
 * Inline styles rather than Tailwind, since a consumer need not use Tailwind.
 */
const renderStickyTitle = (event: CalendarEvent) => (
	<div style={{ height: '100%', background: '#dbeafe', padding: '0 4px' }}>
		<span
			style={{
				position: 'sticky',
				left: 'var(--ilamy-sticky-left)',
				top: 'var(--ilamy-sticky-top)',
				display: 'inline-block',
				maxWidth: '100%',
				// Small enough to fit an 80px resource column with room to slide.
				fontSize: '10px',
			}}
		>
			{event.title}
		</span>
	</div>
)

/** Renders the mistake rather than a plausible-looking wrong screen. */
const Problem = ({ children }: { children: React.ReactNode }) => (
	<div
		data-testid="harness-error"
		style={{ padding: 16, fontFamily: 'monospace' }}
	>
		{children}
	</div>
)
