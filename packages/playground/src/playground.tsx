import './lib/dayjs-locales'

import type { CalendarEvent } from '@ilamy/calendar'
import { Button } from '@ilamy/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@ilamy/ui/components/dialog'
import { type ReactNode, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { CalendarDisplay } from './components/calendar-display'
import { CalendarSettings } from './components/calendar-settings'
import { ResourcePicker } from './components/resource-picker'
import { dummyEvents } from './lib/seed'
import { defaultSettings, type PlaygroundSettings } from './types/settings-form'
import { createResourceEvents, demoResources } from './utils/demo-data'

// On mobile the tall settings panel would push the calendar far down the page, so
// it lives behind a sticky trigger that opens a scrollable dialog; the calendar
// stays full-width and immediately visible. Hidden at lg, where the inline sidebar
// takes over (pure CSS, no JS breakpoint check).
function MobileSettings({ children }: { children: ReactNode }) {
	return (
		<div className="sticky top-2 z-20 mb-4 lg:hidden">
			<Dialog>
				<DialogTrigger asChild>
					<Button className="w-full shadow-lg" size="lg" variant="outline">
						Calendar Settings
					</Button>
				</DialogTrigger>
				<DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0">
					<DialogTitle className="sr-only">Calendar Settings</DialogTitle>
					{children}
				</DialogContent>
			</Dialog>
		</div>
	)
}

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

	const settings = (
		<>
			<CalendarSettings />
			{calendarType === 'resource' && (
				<ResourcePicker
					onToggleResource={toggleResource}
					resources={demoResources}
					selectedResourceIds={selectedResourceIds}
				/>
			)}
		</>
	)

	return (
		<FormProvider {...form}>
			<div
				// The playground is always 100% width; consumers (the demo app, the docs
				// website) own the max-width / centering so the width constraint lives with
				// them. overflow-x-clip keeps a wide view (e.g. month/week, whose columns
				// have a min-width floor) from overflowing the viewport and adding a
				// horizontal page scroll. `clip` (not `hidden`) is deliberate: per MDN it
				// is not a scroll container, so it leaves the calendar's sticky view header
				// and the sticky settings trigger resolving against the viewport.
				className="w-full px-4 py-8 relative overflow-x-clip"
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

				{/* Fixed-width settings sidebar + flexible calendar column. A fixed
				    sidebar keeps the controls comfortable (a `lg:col-span-1` of 4 was too
				    narrow and truncated the button groups); minmax(0,1fr) lets the calendar
				    column shrink instead of overflowing the grid. */}
				<div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
					{/* Settings appear behind a dialog trigger on mobile and as an inline
					    sidebar at lg, switched purely by CSS. Both render the same form;
					    the fields bind via useController, so the two instances safely share
					    one form state (and each FormCheckbox gets a useId-unique id, so the
					    duplicate mount has no colliding control ids). */}
					<MobileSettings>{settings}</MobileSettings>
					<div className="hidden space-y-6 lg:block">{settings}</div>

					<div className="min-w-0">
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
