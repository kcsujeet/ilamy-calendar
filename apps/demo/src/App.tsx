import './index.css'
import '@/lib/dayjs-locales'

import type { CalendarEvent } from '@ilamy/calendar'
import { useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { CalendarDisplay } from '@/components/calendar-display'
import { CalendarSettings } from '@/components/calendar-settings'
import { ResourcePicker } from '@/components/resource-picker'
import { dummyEvents } from '@/lib/seed'
import { type DemoSettingsValues, defaultSettings } from '@/types/settings-form'
import { createResourceEvents, demoResources } from '@/utils/demo-data'

export function App() {
	// One form drives every setting. Components read what they need from this
	// provider via useWatch, so App itself doesn't subscribe to field changes;
	// it only watches calendarType to toggle the resource picker.
	const form = useForm<DemoSettingsValues>({ defaultValues: defaultSettings })
	const calendarType = useWatch({ control: form.control, name: 'calendarType' })

	// Static data, not part of the settings form.
	const [customEvents] = useState<CalendarEvent[]>(dummyEvents)
	const [resourceEvents] = useState<CalendarEvent[]>(createResourceEvents())

	// Resource picker — lets the user swap the resources prop at runtime
	// to verify that the resource calendar reacts to prop changes (issue #153).
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
		<div className="container mx-auto p-8 text-center relative z-10">
			<FormProvider {...form}>
				<div
					className="container mx-auto px-4 py-8 relative"
					data-testid="demo-page"
				>
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-linear-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
							Interactive Demo
						</h1>
						<p className="text-muted-foreground">
							Try out the ilamy Calendar components with different
							configurations
						</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
						{/* Calendar settings sidebar */}
						<div className="lg:col-span-1 space-y-6">
							<CalendarSettings />

							{/* Resource picker */}
							{calendarType === 'resource' && (
								<ResourcePicker
									onToggleResource={toggleResource}
									resources={demoResources}
									selectedResourceIds={selectedResourceIds}
								/>
							)}
						</div>

						{/* Calendar display */}
						<div className="lg:col-span-3">
							<CalendarDisplay
								activeResources={activeResources}
								customEvents={customEvents}
								resourceEvents={resourceEvents}
							/>
						</div>
					</div>
				</div>
			</FormProvider>
		</div>
	)
}
