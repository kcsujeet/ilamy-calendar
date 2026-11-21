import type {
	CalendarEvent,
	DateRange,
	EventsChange,
	IsoDateString,
} from '@ilamy/calendar'
import { Button } from '@ilamy/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@ilamy/ui/components/dialog'
import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { CalendarDisplay } from '../features/calendar-preview/components/calendar-display'
import {
	type ActivityLogEntry,
	CodeAndLogPanel,
} from '../features/code-and-log/components/code-and-log-panel'
import { GeneralPanel } from '../features/settings/components/general-panel'
import { PluginsPanel } from '../features/settings/components/plugins-panel'
import { SchedulePanel } from '../features/settings/components/schedule-panel'
import {
	type SettingsTabId,
	SettingsTabs,
} from '../features/settings/components/settings-tabs'
import { ThemePanel } from '../features/settings/components/theme-panel'
import { dummyEvents } from '../lib/seed'
import {
	defaultSettings,
	type PlaygroundSettings,
} from '../types/settings-form.types'
import { createResourceEvents, demoResources } from '../utils/demo-data.utils'
import { PlaygroundToolbar } from './playground-toolbar'

const MAX_LOG_ENTRIES = 12

const formatLogClock = (): string =>
	new Intl.DateTimeFormat(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).format(new Date())

function MobileSettings({ children }: { children: ReactNode }) {
	return (
		<div className="sticky top-2 z-20 mb-3 lg:hidden">
			<Dialog>
				<DialogTrigger asChild>
					<Button className="w-full shadow-md" size="default" variant="outline">
						<SlidersHorizontal className="size-4 mr-2" />
						Calendar Inspector
					</Button>
				</DialogTrigger>
				<DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 flex flex-col">
					<DialogTitle className="sr-only">Calendar Inspector</DialogTitle>
					{children}
				</DialogContent>
			</Dialog>
		</div>
	)
}

export function Playground() {
	const form = useForm<PlaygroundSettings>({ defaultValues: defaultSettings })
	const [activeTab, setActiveTab] = useState<SettingsTabId>('general')
	const [showInspector, setShowInspector] = useState(false)
	const [logs, setLogs] = useState<ActivityLogEntry[]>([])

	const [customEvents, setCustomEvents] = useState<CalendarEvent[]>(dummyEvents)
	const resourceEvents = useMemo(
		() => createResourceEvents(customEvents),
		[customEvents]
	)

	const appendLog = useCallback(
		(kind: string, summary: string, payload: unknown) => {
			setLogs((prev) => {
				const entry: ActivityLogEntry = {
					id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					time: formatLogClock(),
					kind,
					summary,
					payload: JSON.stringify(payload),
				}
				return [entry, ...prev].slice(0, MAX_LOG_ENTRIES)
			})
		},
		[]
	)

	const onEventAdd = (event: CalendarEvent) => {
		setCustomEvents((prev) => [...prev, event])
	}
	const onEventUpdate = (event: CalendarEvent) => {
		setCustomEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
	}
	const onEventDelete = (event: CalendarEvent) => {
		setCustomEvents((prev) => prev.filter((e) => e.id !== event.id))
	}

	const onEventsChange = useCallback(
		(change: EventsChange) => {
			appendLog(`onEventsChange:${change.action}`, change.event.title, {
				action: change.action,
				event: {
					id: change.event.id,
					start: change.event.start,
					end: change.event.end,
				},
				delta: change.delta,
				endDelta: change.endDelta,
				added: change.added.length,
				updated: change.updated.length,
				deleted: change.deleted.length,
			})
		},
		[appendLog]
	)

	const onDateNavigate = useCallback(
		(date: IsoDateString, range: DateRange) => {
			appendLog('onDateChange', date.slice(0, 10), { date, range })
		},
		[appendLog]
	)

	const [selectedResourceIds, setSelectedResourceIds] = useState<
		Set<string | number>
	>(() => new Set(demoResources.map((r) => r.id)))
	const activeResources = demoResources.filter((r) =>
		selectedResourceIds.has(r.id)
	)
	const toggleResource = (id: string | number) => {
		setSelectedResourceIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const handleReset = () => {
		setCustomEvents(dummyEvents)
		setSelectedResourceIds(new Set(demoResources.map((r) => r.id)))
		setLogs([])
	}

	const tabPanels = {
		general: (
			<GeneralPanel
				onToggleResource={toggleResource}
				resources={demoResources}
				selectedResourceIds={selectedResourceIds}
			/>
		),
		theme: <ThemePanel />,
		plugins: <PluginsPanel />,
		schedule: <SchedulePanel />,
	}

	return (
		<FormProvider {...form}>
			<div
				className="w-full px-3 sm:px-4 py-4 sm:py-6 relative overflow-x-clip"
				data-testid="playground"
			>
				<PlaygroundToolbar
					logCount={logs.length}
					onReset={handleReset}
					onSelectTab={setActiveTab}
					onToggleInspector={() => setShowInspector((prev) => !prev)}
					showInspector={showInspector}
				/>

				<div className="lg:grid lg:grid-cols-[20.5rem_minmax(0,1fr)] lg:gap-5 items-start">
					<MobileSettings>
						<SettingsTabs
							activeTab={activeTab}
							className="border-0 shadow-none max-h-[85dvh]"
							onTabChange={setActiveTab}
							panels={tabPanels}
						/>
					</MobileSettings>

					{/* Sticky self-scrolling inspector keeps the calendar in view at all times */}
					<aside
						aria-label="Calendar inspector"
						className="hidden lg:block sticky top-4"
					>
						<SettingsTabs
							activeTab={activeTab}
							className="max-h-[calc(100dvh-2rem)]"
							onTabChange={setActiveTab}
							panels={tabPanels}
						/>
					</aside>

					<div
						className="min-w-0 outline-none"
						id="calendar-stage"
						tabIndex={-1}
					>
						<CalendarDisplay
							activeResources={activeResources}
							customEvents={customEvents}
							onDateNavigate={onDateNavigate}
							onEventAdd={onEventAdd}
							onEventDelete={onEventDelete}
							onEventsChange={onEventsChange}
							onEventUpdate={onEventUpdate}
							resourceEvents={resourceEvents}
						/>

						{showInspector && (
							<CodeAndLogPanel logs={logs} onClearLogs={() => setLogs([])} />
						)}
					</div>
				</div>
			</div>
		</FormProvider>
	)
}
