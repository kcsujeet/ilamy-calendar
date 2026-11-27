import type {
	FrameworkId,
	PlaygroundSettings,
} from '../../../types/settings-form.types'

type ConditionalLine = [include: boolean, line: string]

const collectLines = (entries: ConditionalLine[]): string[] =>
	entries.filter(([include]) => include).map(([, line]) => line)

const resolveMode = (
	themeMode: PlaygroundSettings['themeMode']
): 'dark' | 'light' => (themeMode === 'dark' ? 'dark' : 'light')

const formatBusinessHoursLiteral = (values: PlaygroundSettings): string =>
	`{ daysOfWeek: ${JSON.stringify(values.businessHoursDays)}, startTime: ${values.businessHoursStart}, endTime: ${values.businessHoursEnd} }`

const STYLEX_SLOT_DECL = (mode: 'dark' | 'light') => {
	const bg = mode === 'dark' ? '#0f172a' : '#ffffff'
	const primary = mode === 'dark' ? '#3b82f6' : '#2563eb'
	return `stylexSlotProps = { root: { style: { '--ilamy-bg': '${bg}', '--ilamy-primary': '${primary}', colorScheme: '${mode}' } } }`
}

const TAILWIND_SLOT_DECL =
	"tailwindSlotProps = { root: { className: 'bg-background text-foreground' }, grid: { className: 'bg-background border border-border rounded-none' }, dayHeader: { className: 'py-2 text-sm font-medium' }, eventBar: { className: 'rounded-sm text-xs font-medium bg-primary text-primary-foreground' } }"

const cssImportPath = (cssMode: PlaygroundSettings['cssMode']): string =>
	cssMode === 'unstyled' || cssMode === 'tailwind'
		? "import '@ilamy/calendar/styles/base.css'"
		: "import '@ilamy/calendar/styles.css'"

const buildCssDecl = (
	values: PlaygroundSettings,
	declPrefix: string
): string => {
	if (values.cssMode === 'stylex') {
		return `\n${declPrefix}${STYLEX_SLOT_DECL(resolveMode(values.themeMode))}`
	}
	if (values.cssMode === 'tailwind') {
		return `\n${declPrefix}${TAILWIND_SLOT_DECL}`
	}
	return ''
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
		call: (v) =>
			typeof v.agendaWindow === 'number'
				? `agendaPlugin({ window: ${v.agendaWindow} })`
				: `agendaPlugin({ window: '${v.agendaWindow}' })`,
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
		call: (v) =>
			v.hideExportButton
				? 'icalPlugin({ showToolbarButton: false })'
				: 'icalPlugin()',
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

interface ReactAxisSetup {
	imports: string[]
	preamble: string[]
	propLines: string[]
}

const buildReactCssSetup = (values: PlaygroundSettings): ReactAxisSetup => {
	if (values.cssMode === 'stylex') {
		return {
			imports: [],
			preamble: [`const ${STYLEX_SLOT_DECL(resolveMode(values.themeMode))}`],
			propLines: ['slotProps={stylexSlotProps}'],
		}
	}
	if (values.cssMode === 'tailwind') {
		return {
			imports: [],
			preamble: [`const ${TAILWIND_SLOT_DECL}`],
			propLines: ['unstyled', 'slotProps={tailwindSlotProps}'],
		}
	}
	if (values.cssMode === 'unstyled') {
		return {
			imports: [],
			preamble: [],
			propLines: collectLines([
				[true, 'unstyled'],
				[values.useCustomSlotProps, 'slotProps={customSlotProps}'],
			]),
		}
	}
	return { imports: [], preamble: [], propLines: [] }
}

const buildReactComponentSetup = (
	values: PlaygroundSettings
): ReactAxisSetup => {
	const shadcnNote =
		values.cssMode === 'tailwind' ? ' // shadcn/ui styling' : ''
	if (values.componentLibrary === 'radix') {
		return {
			imports: [
				`import { RadixHeader, RadixEventForm, RadixMoreEventsDialog } from './radix-slots'${shadcnNote}`,
			],
			preamble: [],
			propLines: [
				'slots={{ header: RadixHeader, eventForm: RadixEventForm, moreEventsDialog: RadixMoreEventsDialog }}',
			],
		}
	}
	if (values.componentLibrary === 'base-ui') {
		return {
			imports: [
				"import { Dialog } from '@base-ui/react/dialog'",
				`import { BaseUiHeader, BaseUiEventForm, BaseUiMoreEventsDialog } from './base-ui-slots'${shadcnNote}`,
			],
			preamble: [],
			propLines: [
				'slots={{ header: BaseUiHeader, eventForm: BaseUiEventForm, moreEventsDialog: BaseUiMoreEventsDialog }}',
			],
		}
	}
	if (values.componentLibrary === 'mui') {
		return {
			imports: [
				"import { useTheme } from '@mui/material/styles'",
				"import { MuiHeader, MuiEventForm, MuiMoreEventsDialog } from './mui-slots'",
			],
			preamble: [
				'const muiTheme = useTheme()',
				"const muiSlotProps = { root: { style: { '--ilamy-bg': muiTheme.palette.background.paper, '--ilamy-primary': muiTheme.palette.primary.main } } }",
			],
			propLines: [
				'slotProps={muiSlotProps}',
				'slots={{ header: MuiHeader, eventForm: MuiEventForm, moreEventsDialog: MuiMoreEventsDialog }}',
			],
		}
	}
	return { imports: [], preamble: [], propLines: [] }
}

const buildDomOptionEntries = (
	values: PlaygroundSettings,
	pluginCalls: string[]
): string[] => {
	const bh = values.enableBusinessHours
	const isUnstyled =
		values.cssMode === 'unstyled' || values.cssMode === 'tailwind'

	return collectLines([
		[values.cssMode === 'stylex', 'slotProps: stylexSlotProps'],
		[values.cssMode === 'tailwind', 'slotProps: tailwindSlotProps'],
		[
			values.cssMode === 'unstyled' && values.useCustomSlotProps,
			'slotProps: customSlotProps',
		],
		[isUnstyled, 'unstyled: true'],
		[true, 'events'],
		[values.calendarType === 'resource', 'resources'],
		[pluginCalls.length > 0, `plugins: [${pluginCalls.join(', ')}]`],
		[values.initialView !== 'month', `initialView: '${values.initialView}'`],
		[Boolean(values.timezone), `timezone: '${values.timezone}'`],
		[!values.disableDragAndDrop, 'editable: true'],
		[values.nowIndicator, 'nowIndicator: true'],
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
	axisProps: string[],
	pluginCalls: string[]
): string[] => {
	const isResource = values.calendarType === 'resource'
	const bh = values.enableBusinessHours

	return [
		...axisProps,
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
	const cssSetup = buildReactCssSetup(values)
	const compSetup = buildReactComponentSetup(values)
	const imports = [
		"import { IlamyCalendar } from '@ilamy/calendar/react'",
		cssImportPath(values.cssMode),
		...cssSetup.imports,
		...compSetup.imports,
		...pluginImports,
	]
	const props = buildReactPropLines(
		values,
		[...cssSetup.propLines, ...compSetup.propLines],
		pluginCalls
	)
	const preamble = [...cssSetup.preamble, ...compSetup.preamble]
	const preambleBlock =
		preamble.length > 0 ? `\n  ${preamble.join('\n  ')}\n` : ''

	if (values.calendarType === 'multi-zone') {
		const primaryProps = props.map((line) => `      ${line}`).join('\n')
		const secondaryProps = props
			.map((line) =>
				line.startsWith('timezone=')
					? `timezone="${values.secondaryTimezone}"`
					: line
			)
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
	const cssDecl = buildCssDecl(values, 'const ')
	const pluginMeta = buildPluginImportsAndList(values)
	const pluginImportLines = pluginMeta.imports.join('\n')
	const isUnstyled =
		values.cssMode === 'unstyled' || values.cssMode === 'tailwind'
	const slotPropsAttr =
		values.cssMode === 'stylex'
			? ':slot-props="stylexSlotProps"'
			: values.cssMode === 'tailwind'
				? ':slot-props="tailwindSlotProps"'
				: ''

	const attrs = collectLines([
		[true, ':events="events"'],
		[values.calendarType === 'resource', ':resources="resources"'],
		[pluginMeta.calls.length > 0, ':plugins="plugins"'],
		[Boolean(slotPropsAttr), slotPropsAttr],
		[isUnstyled, 'unstyled'],
		[values.initialView !== 'month', `initial-view="${values.initialView}"`],
		[Boolean(values.timezone), `timezone="${values.timezone}"`],
		[!values.disableDragAndDrop, 'editable'],
		[values.nowIndicator, 'now-indicator'],
		[true, '@events-change="handleEventsChange"'],
	])

	const pluginsDecl =
		pluginMeta.calls.length > 0
			? `\nconst plugins = [${pluginMeta.calls.join(', ')}]`
			: ''

	return `<script setup lang="ts">
${cssImportPath(values.cssMode)}
import { IlamyCalendar } from '@ilamy/calendar/vue'${pluginImportLines ? `\n${pluginImportLines}` : ''}
import { ref } from 'vue'${cssDecl}${pluginsDecl}

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
	const cssDecl = buildCssDecl(values, '  const ')
	const pluginMeta = buildPluginImportsAndList(values)
	const pluginImports = pluginMeta.imports.map((line) => `  ${line}`).join('\n')
	const opts = buildDomOptionEntries(values, pluginMeta.calls)
		.map((line) => `    ${line},`)
		.join('\n')

	return `<script lang="ts">
  ${cssImportPath(values.cssMode)}
  import { ilamyCalendar } from '@ilamy/calendar/svelte'${pluginImports ? `\n${pluginImports}` : ''}${cssDecl}

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
	const cssDecl = buildCssDecl(values, '  const ')
	const pluginMeta = buildPluginImportsAndList(values)
	const pluginImportLines = pluginMeta.imports.join('\n')
	const isUnstyled =
		values.cssMode === 'unstyled' || values.cssMode === 'tailwind'
	const slotPropsProp =
		values.cssMode === 'stylex'
			? 'slotProps={stylexSlotProps}'
			: values.cssMode === 'tailwind'
				? 'slotProps={tailwindSlotProps}'
				: ''

	const props = collectLines([
		[Boolean(slotPropsProp), slotPropsProp],
		[isUnstyled, 'unstyled'],
		[true, 'events={events()}'],
		[values.calendarType === 'resource', 'resources={resources}'],
		[pluginMeta.calls.length > 0, `plugins={[${pluginMeta.calls.join(', ')}]}`],
		[values.initialView !== 'month', `initialView="${values.initialView}"`],
		[Boolean(values.timezone), `timezone="${values.timezone}"`],
		[!values.disableDragAndDrop, 'editable'],
		[values.nowIndicator, 'nowIndicator'],
		[true, 'onEventsChange={(change) => console.log(change)}'],
	])

	return `${cssImportPath(values.cssMode)}
import { createSignal } from 'solid-js'
import { IlamyCalendar } from '@ilamy/calendar/solid'${pluginImportLines ? `\n${pluginImportLines}` : ''}

export function CalendarDemo() {
  const [events] = createSignal(initialEvents)${cssDecl}

  return (
    <IlamyCalendar
      ${props.join('\n      ')}
    />
  )
}`
}

const generateAngularSnippet = (values: PlaygroundSettings): string => {
	const cssDecl = buildCssDecl(values, '  readonly ')
	const pluginMeta = buildPluginImportsAndList(values)
	const pluginImportLines = pluginMeta.imports.join('\n')
	const opts = buildDomOptionEntries(values, pluginMeta.calls)
		.map(
			(line) =>
				`      ${line
					.replace('stylexSlotProps', 'this.stylexSlotProps')
					.replace('tailwindSlotProps', 'this.tailwindSlotProps')},`
		)
		.join('\n')

	return `${cssImportPath(values.cssMode)}
import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core'
import { registerIlamyCalendarElement } from '@ilamy/calendar/angular'${pluginImportLines ? `\n${pluginImportLines}` : ''}

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
  readonly events = signal(initialEvents)${cssDecl}
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

/** Generates a clean, copyable snippet matching the active framework & 3-axis playground settings. */
export function generateCodeSnippet(values: PlaygroundSettings): string {
	return SNIPPET_GENERATORS[values.framework](values)
}
