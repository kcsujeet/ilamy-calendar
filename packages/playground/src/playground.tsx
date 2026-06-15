import './lib/dayjs-locales'

import type { CalendarEvent } from '@ilamy/calendar'
import { useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { CalendarDisplay } from './components/calendar-display'
import { CalendarSettings } from './components/calendar-settings'
import { ResourcePicker } from './components/resource-picker'
import { dummyEvents } from './lib/seed'
import { defaultSettings, type PlaygroundSettings } from './types/settings-form'
import { createResourceEvents, demoResources } from './utils/demo-data'

// The shared interactive calendar demo. One react-hook-form drives every
// setting; components read what they need from the provider via useWatch.
// Consumed by both the demo app and the docs website.
export function Playground() {
	const form = useForm<PlaygroundSettings>({ defaultValues: defaultSettings })
	const calendarType = useWatch({ control: form.control, name: 'calendarType' })

	// Event state — the lifecycle callbacks (when enabled) mutate this so
	// add/update/delete are reflected live.
	const [customEvents, setCustomEvents] = useState<CalendarEvent[]>(dummyEvents)
	const resourceEvents = useMemo(
		() => createResourceEvents(customEvents),
		[customEvents]
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

	// Resource picker — lets the user swap the resources prop at runtime to verify
	// the resource calendar reacts to prop changes (issue #153).
	const [selectedResourceIds, setSelectedResourceIds] = useState<
		Set<string | number>
	>(new Set(demoResources.map((r) => r.id)))
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

	return (
		<FormProvider {...form}>
			<div
				className="container mx-auto px-4 py-8 relative"
				data-testid="playground"
			>
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-linear-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
						Interactive Demo
					</h1>
					<p className="text-muted-foreground">
						Try out the ilamy Calendar components with different configurations
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					<div className="lg:col-span-1 space-y-6">
						<CalendarSettings />
						{calendarType === 'resource' && (
							<ResourcePicker
								onToggleResource={toggleResource}
								resources={demoResources}
								selectedResourceIds={selectedResourceIds}
							/>
						)}
					</div>

					<div className="lg:col-span-3">
						<CalendarDisplay
							activeResources={activeResources}
							customEvents={customEvents}
							onEventAdd={onEventAdd}
							onEventDelete={onEventDelete}
							onEventUpdate={onEventUpdate}
							resourceEvents={resourceEvents}
						/>
					</div>
				</div>
			</div>
		</FormProvider>
	)
}
