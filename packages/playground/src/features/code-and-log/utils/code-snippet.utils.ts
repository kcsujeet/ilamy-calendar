import type {
	FrameworkId,
	PlaygroundSettings,
} from '../../../types/settings-form.types'

type ConditionalLine = [include: boolean, line: string]

const collectLines = (entries: ConditionalLine[]): string[] =>
	entries.filter(([include]) => include).map(([, line]) => line)

const resolveStylexMode = (
	themeMode: PlaygroundSettings['themeMode']
): 'dark' | 'light' => (themeMode === 'dark' ? 'dark' : 'light')

const formatBusinessHoursLiteral = (values: PlaygroundSettings): string =>
	`{ daysOfWeek: ${JSON.stringify(values.businessHoursDays)}, startTime: ${values.businessHoursStart}, endTime: ${values.businessHoursEnd} }`

const buildStylexLines = (
	values: PlaygroundSettings,
	importIndent: string,
	declPrefix: string
): { importLine: string; declLine: string } => {
	if (values.themePreset !== 'stylex') {
		return { importLine: '', declLine: '' }
	}
	const mode = resolveStylexMode(values.themeMode)
	return {
		importLine: `\n${importIndent}import { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex'`,
		declLine: `\n${declPrefix}stylexTheme = createStylexCalendarTheme({ mode: '${mode}' })`,
	}
}

interface PluginSnippetSpec {
	enabled: (values: PlaygroundSettings) => boolean
	importLine: string
	call: (values: PlaygroundSettings) => string
}

const PLUGIN_SNIPPET_SPECS: PluginSnippetSpec[] = [
	{
		enabled: (v) => v.enableRecurrencePlugin,
		importLine:
			"import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'",
		call: () => 'recurrencePlugin()',
	},
	{
		enabled: (v) => v.enableAgendaPlugin,
		importLine: "import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'",
		call: (v) => {
			if (typeof v.agendaWindow === 'number') {
				return `agendaPlugin({ window: ${v.agendaWindow} })`
			}
			return `agendaPlugin({ window: '${v.agendaWindow}' })`
		},
	},
	{
		enabled: (v) => v.enableDragToCreatePlugin,
		importLine:
			"import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'",
		call: () => 'dragToCreatePlugin()',
	},
	{
		enabled: (v) => v.enableYearPlugin,
		importLine: "import { yearPlugin } from '@ilamy/calendar/plugins/year'",
		call: () => 'yearPlugin()',
	},
	{
		enabled: (v) => v.enableIcalPlugin,
		importLine: "import { icalPlugin } from '@ilamy/calendar/plugins/ical'",
		call: (v) => {
			if (v.hideExportButton) {
				return 'icalPlugin({ showToolbarButton: false })'
			}
			return 'icalPlugin()'
		},
	},
]

const buildPluginImportsAndList = (
	values: PlaygroundSettings
): { imports: string[]; calls: string[] } => {
	const active = PLUGIN_SNIPPET_SPECS.filter((spec) => spec.enabled(values))
	return {
		imports: active.map((spec) => spec.importLine),
		calls: active.map((spec) => spec.call(values)),
	}
}

interface ThemeSetup {
	imports: string[]
	preamble: string[]
	propLines: string[]
}

const THEME_SETUP_BUILDERS: Record<
	PlaygroundSettings['themePreset'],
	(values: PlaygroundSettings) => ThemeSetup
> = {
	tailwind: () => ({ imports: [], preamble: [], propLines: [] }),
	mui: (values) => {
		if (values.framework !== 'react') {
			return { imports: [], preamble: [], propLines: [] }
		}
		return {
			imports: [
				"import { useMuiCalendarTheme } from '@ilamy/calendar/themes/mui'",
			],
			preamble: ['const muiTheme = useMuiCalendarTheme()'],
			propLines: ['{...muiTheme}'],
		}
	},
	stylex: (values) => {
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
	},
	unstyled: (values) => ({
		imports: [],
		preamble: [],
		propLines: collectLines([
			[true, 'unstyled'],
			[values.useCustomSlotProps, 'slotProps={customSlotProps}'],
		]),
	}),
}

const buildDomOptionEntries = (values: PlaygroundSettings): string[] => {
	const isStylex = values.themePreset === 'stylex'
	const isUnstyled = values.themePreset === 'unstyled'
	const hasIcal = values.enableIcalPlugin && !values.hideExportButton
	const bh = values.enableBusinessHours

	return collectLines([
		[isStylex, '...stylexTheme'],
		[isUnstyled, 'unstyled: true'],
		[isUnstyled && values.useCustomSlotProps, 'slotProps: customSlotProps'],
		[true, 'events'],
		[values.calendarType === 'resource', 'resources'],
		[values.initialView !== 'month', `initialView: '${values.initialView}'`],
		[Boolean(values.timezone), `timezone: '${values.timezone}'`],
		[!values.disableDragAndDrop, 'editable: true'],
		[values.nowIndicator, 'nowIndicator: true'],
		[values.enableDragToCreatePlugin, 'enableDragToCreate: true'],
		[hasIcal, 'enableIcalExport: true'],
		[bh, `businessHours: [${formatBusinessHoursLiteral(values)}]`],
		[
			bh && values.constrainEventsToBusinessHours,
			"eventConstraint: 'businessHours'",
		],
		[
			bh && values.constrainSelectToBusinessHours,
			"selectConstraint: 'businessHours'",
		],
	])
}

const buildReactPropLines = (
	values: PlaygroundSettings,
	themePropLines: string[],
	pluginCalls: string[]
): string[] => {
	const isResource = values.calendarType === 'resource'
	const bh = values.enableBusinessHours

	return [
		...themePropLines,
		...collectLines([
			[true, 'events={events}'],
			[isResource, 'resources={resources}'],
			[
				isResource && values.orientation !== 'horizontal',
				`orientation="${values.orientation}"`,
			],
			[
				isResource && values.weekViewGranularity !== 'hourly',
				`weekViewGranularity="${values.weekViewGranularity}"`,
			],
			[pluginCalls.length > 0, `plugins={[${pluginCalls.join(', ')}]}`],
			[!values.disableDragAndDrop, 'editable'],
			[values.eventResizableFromStart, 'eventResizableFromStart'],
			[values.initialView !== 'month', `initialView="${values.initialView}"`],
			[values.locale !== 'en', `locale="${values.locale}"`],
			[Boolean(values.timezone), `timezone="${values.timezone}"`],
			[values.timeFormat !== '12-hour', `timeFormat="${values.timeFormat}"`],
			[
				values.firstDayOfWeek !== 'sunday',
				`firstDayOfWeek="${values.firstDayOfWeek}"`,
			],
			[values.nowIndicator, 'nowIndicator'],
			[values.scrollToNow, 'scrollToNow'],
			[!values.showEventTimes, 'displayEventTime={false}'],
			[values.showEventEnd, 'displayEventEnd'],
			[values.slotDuration !== 60, `slotDuration={${values.slotDuration}}`],
			[values.snapDuration !== 0, `snapDuration={${values.snapDuration}}`],
			[bh, `businessHours={${formatBusinessHoursLiteral(values)}}`],
			[bh && values.hideNonBusinessHours, 'hideNonBusinessHours'],
			[
				bh && values.constrainEventsToBusinessHours,
				'eventConstraint="businessHours"',
			],
			[
				bh && values.constrainSelectToBusinessHours,
				'selectConstraint="businessHours"',
			],
		]),
	]
}

const generateReactSnippet = (values: PlaygroundSettings): string => {
	const { imports: pluginImports, calls: pluginCalls } =
		buildPluginImportsAndList(values)
	const theme = THEME_SETUP_BUILDERS[values.themePreset](values)
	const imports = [
		"import { IlamyCalendar } from '@ilamy/calendar/react'",
		"import '@ilamy/calendar/styles.css'",
		...theme.imports,
		...pluginImports,
	]
	const props = buildReactPropLines(values, theme.propLines, pluginCalls)

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
${props.map((line) => `      ${line}`).join('\n')}
    />
  )
}`
}

const generateVueSnippet = (values: PlaygroundSettings): string => {
	const stylex = buildStylexLines(values, '', 'const ')
	const hasIcal = values.enableIcalPlugin && !values.hideExportButton
	const attrs = collectLines([
		[true, ':events="events"'],
		[values.calendarType === 'resource', ':resources="resources"'],
		[values.themePreset === 'stylex', 'v-bind="stylexTheme"'],
		[values.themePreset === 'unstyled', 'unstyled'],
		[values.initialView !== 'month', `initial-view="${values.initialView}"`],
		[Boolean(values.timezone), `timezone="${values.timezone}"`],
		[!values.disableDragAndDrop, 'editable'],
		[values.nowIndicator, 'now-indicator'],
		[hasIcal, 'enable-ical-export'],
		[true, '@events-change="handleEventsChange"'],
	])

	return `<script setup lang="ts">
import '@ilamy/calendar/styles.css'
import { IlamyCalendar } from '@ilamy/calendar/vue'${stylex.importLine}
import { ref } from 'vue'${stylex.declLine}

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
	const stylex = buildStylexLines(values, '  ', '  const ')
	const opts = buildDomOptionEntries(values)
		.map((line) => `    ${line},`)
		.join('\n')

	return `<script lang="ts">
  import '@ilamy/calendar/styles.css'
  import { ilamyCalendar } from '@ilamy/calendar/svelte'${stylex.importLine}${stylex.declLine}

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
	const stylex = buildStylexLines(values, '', '  const ')
	const props = collectLines([
		[values.themePreset === 'stylex', '{...stylexTheme}'],
		[values.themePreset === 'unstyled', 'unstyled'],
		[true, 'events={events()}'],
		[values.calendarType === 'resource', 'resources={resources}'],
		[values.initialView !== 'month', `initialView="${values.initialView}"`],
		[Boolean(values.timezone), `timezone="${values.timezone}"`],
		[!values.disableDragAndDrop, 'editable'],
		[values.nowIndicator, 'nowIndicator'],
		[true, 'onEventsChange={(change) => console.log(change)}'],
	])

	return `import '@ilamy/calendar/styles.css'
import { createSignal } from 'solid-js'
import { IlamyCalendar } from '@ilamy/calendar/solid'${stylex.importLine}

export function CalendarDemo() {
  const [events] = createSignal(initialEvents)${stylex.declLine}

  return (
    <IlamyCalendar
      ${props.join('\n      ')}
    />
  )
}`
}

const generateAngularSnippet = (values: PlaygroundSettings): string => {
	const stylex = buildStylexLines(values, '', '  readonly ')
	const opts = buildDomOptionEntries(values)
		.map((line) => `      ${line.replace('stylexTheme', 'this.stylexTheme')},`)
		.join('\n')

	return `import '@ilamy/calendar/styles.css'
import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core'
import { registerIlamyCalendarElement } from '@ilamy/calendar/angular'${stylex.importLine}

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
  readonly events = signal(initialEvents)${stylex.declLine}
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

const SNIPPET_GENERATORS: Record<
	FrameworkId,
	(values: PlaygroundSettings) => string
> = {
	react: generateReactSnippet,
	vue: generateVueSnippet,
	svelte: generateSvelteSnippet,
	solid: generateSolidSnippet,
	angular: generateAngularSnippet,
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
	return SNIPPET_GENERATORS[values.framework](values)
}
