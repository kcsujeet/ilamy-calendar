import type { FrameworkId, PlaygroundSettings } from '../types/settings-form'

const resolveStylexMode = (
	themeMode: PlaygroundSettings['themeMode']
): 'dark' | 'light' => {
	if (themeMode === 'dark') {
		return 'dark'
	}
	return 'light'
}

const buildPluginImportsAndList = (
	values: PlaygroundSettings
): { imports: string[]; calls: string[] } => {
	const imports: string[] = []
	const calls: string[] = []

	if (values.enableRecurrencePlugin) {
		imports.push(
			"import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'"
		)
		calls.push('recurrencePlugin()')
	}
	if (values.enableAgendaPlugin) {
		imports.push(
			"import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'"
		)
		let win: number | string = `'${values.agendaWindow}'`
		if (typeof values.agendaWindow === 'number') {
			win = values.agendaWindow
		}
		calls.push(`agendaPlugin({ window: ${win} })`)
	}
	if (values.enableDragToCreatePlugin) {
		imports.push(
			"import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'"
		)
		calls.push('dragToCreatePlugin()')
	}
	if (values.enableYearPlugin) {
		imports.push("import { yearPlugin } from '@ilamy/calendar/plugins/year'")
		calls.push('yearPlugin()')
	}
	if (values.enableIcalPlugin) {
		imports.push("import { icalPlugin } from '@ilamy/calendar/plugins/ical'")
		let icalCall = 'icalPlugin()'
		if (values.hideExportButton) {
			icalCall = 'icalPlugin({ showToolbarButton: false })'
		}
		calls.push(icalCall)
	}

	return { imports, calls }
}

const buildThemeSetup = (
	values: PlaygroundSettings
): { imports: string[]; preamble: string[]; propLines: string[] } => {
	if (values.themePreset === 'mui' && values.framework === 'react') {
		return {
			imports: [
				"import { useMuiCalendarTheme } from '@ilamy/calendar/themes/mui'",
			],
			preamble: ['const muiTheme = useMuiCalendarTheme()'],
			propLines: ['{...muiTheme}'],
		}
	}
	if (values.themePreset === 'stylex') {
		const mode = resolveStylexMode(values.themeMode)
		return {
			imports: [
				"import { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'",
			],
			preamble: [
				`const stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`,
			],
			propLines: ['{...stylexTheme}'],
		}
	}
	if (values.themePreset === 'unstyled') {
		const propLines = ['unstyled']
		if (values.useCustomSlotProps) {
			propLines.push('slotProps={customSlotProps}')
		}
		return {
			imports: [],
			preamble: [],
			propLines,
		}
	}
	return { imports: [], preamble: [], propLines: [] }
}

const buildDomOptionEntries = (values: PlaygroundSettings): string[] => {
	const entries: string[] = []
	if (values.themePreset === 'stylex') {
		entries.push('...stylexTheme')
	} else if (values.themePreset === 'unstyled') {
		entries.push('unstyled: true')
		if (values.useCustomSlotProps) {
			entries.push('slotProps: customSlotProps')
		}
	}
	entries.push('events')
	if (values.calendarType === 'resource') {
		entries.push('resources')
	}
	if (values.initialView !== 'month') {
		entries.push(`initialView: '${values.initialView}'`)
	}
	if (values.timezone) {
		entries.push(`timezone: '${values.timezone}'`)
	}
	if (!values.disableDragAndDrop) {
		entries.push('editable: true')
	}
	if (values.nowIndicator) {
		entries.push('nowIndicator: true')
	}
	if (values.enableDragToCreatePlugin) {
		entries.push('enableDragToCreate: true')
	}
	if (values.enableIcalPlugin && !values.hideExportButton) {
		entries.push('enableIcalExport: true')
	}
	if (values.enableBusinessHours) {
		entries.push(
			`businessHours: [{ daysOfWeek: ${JSON.stringify(values.businessHoursDays)}, startTime: ${values.businessHoursStart}, endTime: ${values.businessHoursEnd} }]`
		)
		if (values.constrainEventsToBusinessHours) {
			entries.push("eventConstraint: 'businessHours'")
		}
		if (values.constrainSelectToBusinessHours) {
			entries.push("selectConstraint: 'businessHours'")
		}
	}
	return entries
}

const generateVueSnippet = (values: PlaygroundSettings): string => {
	let stylexImport = ''
	let stylexLine = ''
	if (values.themePreset === 'stylex') {
		const mode = resolveStylexMode(values.themeMode)
		stylexImport =
			"\nimport { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'"
		stylexLine = `\nconst stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`
	}
	const attrs: string[] = [':events="events"']
	if (values.calendarType === 'resource') attrs.push(':resources="resources"')
	if (values.themePreset === 'stylex') attrs.push('v-bind="stylexTheme"')
	if (values.themePreset === 'unstyled') attrs.push('unstyled')
	if (values.initialView !== 'month') {
		attrs.push(`initial-view="${values.initialView}"`)
	}
	if (values.timezone) attrs.push(`timezone="${values.timezone}"`)
	if (!values.disableDragAndDrop) attrs.push('editable')
	if (values.nowIndicator) attrs.push('now-indicator')
	if (values.enableIcalPlugin && !values.hideExportButton) {
		attrs.push('enable-ical-export')
	}
	attrs.push('@events-change="handleEventsChange"')

	return `<script setup lang="ts">
import { IlamyCalendar } from '@ilamy/calendar/vue'${stylexImport}
import { ref } from 'vue'${stylexLine}

const events = ref(initialEvents)
const handleEventsChange = (change) => console.log(change)
</script>

<template>
  <IlamyCalendar
    ${attrs.join('\n    ')}
  />
</template>`
}

const generateSvelteSnippet = (values: PlaygroundSettings): string => {
	let stylexImport = ''
	let stylexLine = ''
	if (values.themePreset === 'stylex') {
		const mode = resolveStylexMode(values.themeMode)
		stylexImport =
			"\n  import { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'"
		stylexLine = `\n  const stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`
	}
	const opts = buildDomOptionEntries(values)
		.map((line) => `    ${line},`)
		.join('\n')

	return `<script lang="ts">
  import { ilamyCalendar } from '@ilamy/calendar/svelte'${stylexImport}${stylexLine}

  let events = $state(initialEvents)
</script>

<div
  class="h-[600px]"
  {@attach ilamyCalendar({
${opts}
    onEventsChange: (change) => console.log(change),
  })}
/>`
}

const generateSolidSnippet = (values: PlaygroundSettings): string => {
	let stylexImport = ''
	let stylexLine = ''
	if (values.themePreset === 'stylex') {
		const mode = resolveStylexMode(values.themeMode)
		stylexImport =
			"\nimport { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'"
		stylexLine = `\n  const stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`
	}
	const props: string[] = []
	if (values.themePreset === 'stylex') props.push('{...stylexTheme}')
	if (values.themePreset === 'unstyled') props.push('unstyled')
	props.push('events={events()}')
	if (values.calendarType === 'resource') props.push('resources={resources}')
	if (values.initialView !== 'month') {
		props.push(`initialView="${values.initialView}"`)
	}
	if (values.timezone) props.push(`timezone="${values.timezone}"`)
	if (!values.disableDragAndDrop) props.push('editable')
	if (values.nowIndicator) props.push('nowIndicator')
	props.push('onEventsChange={(change) => console.log(change)}')

	return `import { createSignal } from 'solid-js'
import { IlamyCalendar } from '@ilamy/calendar/solid'${stylexImport}

export function CalendarDemo() {
  const [events] = createSignal(initialEvents)${stylexLine}

  return (
    <IlamyCalendar
      ${props.join('\n      ')}
    />
  )
}`
}

const generateAngularSnippet = (values: PlaygroundSettings): string => {
	let stylexImport = ''
	let stylexLine = ''
	if (values.themePreset === 'stylex') {
		const mode = resolveStylexMode(values.themeMode)
		stylexImport =
			"\nimport { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'"
		stylexLine = `\n  readonly stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`
	}
	const opts = buildDomOptionEntries(values)
		.map((line) => `      ${line.replace('stylexTheme', 'this.stylexTheme')},`)
		.join('\n')

	return `import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core'
import { registerIlamyCalendarElement } from '@ilamy/calendar/angular'${stylexImport}

registerIlamyCalendarElement()

@Component({
  selector: 'app-calendar-demo',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <ilamy-calendar
      class="block h-[600px]"
      [options]="calendarOptions()"
      (eventsChange)="onEventsChange($event)"
    ></ilamy-calendar>
  \`,
})
export class CalendarDemoComponent {
  readonly events = signal(initialEvents)${stylexLine}
  readonly calendarOptions = computed(() => {
    const events = this.events()
    return {
${opts}
    }
  })

  onEventsChange(event: Event) {
    console.log((event as CustomEvent).detail)
  }
}`
}

export const FRAMEWORK_CODE_TAB_LABELS: Record<FrameworkId, string> = {
	react: 'Live React',
	vue: 'Live Vue',
	svelte: 'Live Svelte',
	solid: 'Live Solid',
	angular: 'Live Angular',
}

/** Generates a clean, copyable snippet matching the active framework & playground settings. */
export function generateCodeSnippet(values: PlaygroundSettings): string {
	if (values.framework === 'vue') return generateVueSnippet(values)
	if (values.framework === 'svelte') return generateSvelteSnippet(values)
	if (values.framework === 'solid') return generateSolidSnippet(values)
	if (values.framework === 'angular') return generateAngularSnippet(values)

	const { imports: pluginImports, calls: pluginCalls } =
		buildPluginImportsAndList(values)
	const theme = buildThemeSetup(values)

	const imports = [
		"import { IlamyCalendar } from '@ilamy/calendar'",
		...theme.imports,
		...pluginImports,
	]

	const props: string[] = [...theme.propLines, 'events={events}']

	if (values.calendarType === 'resource') {
		props.push('resources={resources}')
		if (values.orientation !== 'horizontal') {
			props.push(`orientation="${values.orientation}"`)
		}
		if (values.weekViewGranularity !== 'hourly') {
			props.push(`weekViewGranularity="${values.weekViewGranularity}"`)
		}
	}

	if (pluginCalls.length > 0) {
		props.push(`plugins={[${pluginCalls.join(', ')}]}`)
	}

	if (!values.disableDragAndDrop) {
		props.push('editable')
	}
	if (values.eventResizableFromStart) {
		props.push('eventResizableFromStart')
	}
	if (values.initialView !== 'month') {
		props.push(`initialView="${values.initialView}"`)
	}
	if (values.locale !== 'en') {
		props.push(`locale="${values.locale}"`)
	}
	if (values.timezone) {
		props.push(`timezone="${values.timezone}"`)
	}
	if (values.timeFormat !== '12-hour') {
		props.push(`timeFormat="${values.timeFormat}"`)
	}
	if (values.firstDayOfWeek !== 'sunday') {
		props.push(`firstDayOfWeek="${values.firstDayOfWeek}"`)
	}
	if (values.nowIndicator) {
		props.push('nowIndicator')
	}
	if (values.scrollToNow) {
		props.push('scrollToNow')
	}
	if (!values.showEventTimes) {
		props.push('displayEventTime={false}')
	}
	if (values.showEventEnd) {
		props.push('displayEventEnd')
	}
	if (values.slotDuration !== 60) {
		props.push(`slotDuration={${values.slotDuration}}`)
	}
	if (values.snapDuration !== 0) {
		props.push(`snapDuration={${values.snapDuration}}`)
	}
	if (values.enableBusinessHours) {
		props.push(
			`businessHours={{ daysOfWeek: ${JSON.stringify(values.businessHoursDays)}, startTime: ${values.businessHoursStart}, endTime: ${values.businessHoursEnd} }}`
		)
		if (values.hideNonBusinessHours) {
			props.push('hideNonBusinessHours')
		}
		if (values.constrainEventsToBusinessHours) {
			props.push('eventConstraint="businessHours"')
		}
		if (values.constrainSelectToBusinessHours) {
			props.push('selectConstraint="businessHours"')
		}
	}

	const propIndent = '    '
	let preambleBlock = ''
	if (theme.preamble.length > 0) {
		preambleBlock = `\n  ${theme.preamble.join('\n  ')}\n`
	}

	if (values.calendarType === 'multi-zone') {
		const primaryProps = props.map((line) => `      ${line}`).join('\n')
		const secondaryProps = props
			.map((line) => {
				if (line.startsWith('timezone=')) {
					return `timezone="${values.secondaryTimezone}"`
				}
				return line
			})
			.map((line) => `      ${line}`)
			.join('\n')
		return `${imports.join('\n')}

export function MultiZoneDemo() {${preambleBlock}
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <IlamyCalendar
${primaryProps}
      />
      <IlamyCalendar
${secondaryProps}
      />
    </div>
  )
}`
	}

	return `${imports.join('\n')}

export function CalendarDemo() {${preambleBlock}
  return (
    <IlamyCalendar
${props.map((line) => `${propIndent}  ${line}`).join('\n')}
    />
  )
}`
}
