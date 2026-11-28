import { cn } from '../../../lib/utils'
import { useFormContext, useWatch } from 'react-hook-form'
import { FormButtonGroup } from '../../../components/form/form-button-group'
import { FormCheckbox } from '../../../components/form/form-checkbox'
import type {
	PlaygroundSettings,
	ThemeAccent,
} from '../../../types/settings-form.types'
import { THEME_ACCENTS } from '../../../utils/demo-themes.utils'
import { THEME_MODE_OPTIONS } from '../utils/settings-options.utils'
import { SectionHeading } from './settings-fields'

interface RenderPropToggle {
	name: keyof PlaygroundSettings
	label: string
	resourceOnly?: boolean
}

const RENDER_PROP_TOGGLES: RenderPropToggle[] = [
	{
		name: 'useCustomEventRenderer',
		label: 'Custom event renderer (renderEvent)',
	},
	{
		name: 'useCustomResourceRenderer',
		label: 'Custom resource renderer (renderResource)',
		resourceOnly: true,
	},
	{
		name: 'useCustomCalendarHeader',
		label: 'Custom header (headerComponent)',
	},
	{
		name: 'useCustomEventForm',
		label: 'Custom event form (renderEventForm)',
	},
	{
		name: 'useCustomCurrentTimeIndicator',
		label: 'Custom now indicator',
	},
	{
		name: 'useCustomHourRenderer',
		label: 'Custom hour labels (renderHour)',
	},
	{
		name: 'useCustomClasses',
		label: 'Custom disabled cell classes',
	},
]

const ACCENT_KEYS = Object.keys(THEME_ACCENTS) as ThemeAccent[]

export function ThemePanel() {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	const framework = useWatch({ control, name: 'framework' })
	const cssMode = useWatch({ control, name: 'cssMode' })
	const componentLibrary = useWatch({ control, name: 'componentLibrary' })
	const themeAccent = useWatch({ control, name: 'themeAccent' })
	const calendarType = useWatch({ control, name: 'calendarType' })
	const isResource = calendarType === 'resource'
	const usesMuiVars = framework === 'react' && componentLibrary === 'mui'
	const usesShadcnPairing =
		framework === 'react' &&
		cssMode === 'tailwind' &&
		(componentLibrary === 'radix' || componentLibrary === 'base-ui')
	const supportsPalette = cssMode === 'stylex' || usesMuiVars
	const showColorMode =
		cssMode === 'stylex' || cssMode === 'unstyled' || usesMuiVars

	return (
		<>
			<SectionHeading>Theme Customization</SectionHeading>
			{cssMode === 'plain' && !usesMuiVars && (
				<p className="text-xs text-muted-foreground leading-relaxed">
					Built-in <code className="font-mono">@ilamy/calendar/styles.css</code>{' '}
					tokens automatically bridge page light/dark CSS variables.
				</p>
			)}

			{cssMode === 'tailwind' && (
				<p className="text-xs text-muted-foreground leading-relaxed">
					Running <code className="font-mono">unstyled</code> with Tailwind v4
					utility classes in <code className="font-mono">slotProps</code>
					{usesShadcnPairing
						? ` (shadcn/ui setup over ${componentLibrary === 'base-ui' ? 'Base UI' : 'Radix UI'} primitives)`
						: ''}
					.
				</p>
			)}

			{showColorMode && (
				<FormButtonGroup
					label="Color Mode"
					name="themeMode"
					options={THEME_MODE_OPTIONS}
				/>
			)}

			{supportsPalette && (
				<div className="space-y-1.5">
					<span className="block text-sm font-medium">Accent Token</span>
					<div className="grid grid-cols-4 gap-1.5">
						{ACCENT_KEYS.map((key) => {
							const item = THEME_ACCENTS[key]
							const isSelected = themeAccent === key
							let swatchTone = 'border-border hover:bg-accent/40'
							if (isSelected) {
								swatchTone =
									'border-primary ring-2 ring-primary/25 bg-accent/60'
							}
							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer transition-all',
										swatchTone
									)}
									key={key}
									onClick={() => setValue('themeAccent', key)}
									type="button"
								>
									<span
										className="size-3 rounded-full shrink-0"
										style={{ backgroundColor: item.swatch }}
									/>
									{item.label}
								</button>
							)
						})}
					</div>
				</div>
			)}

			{cssMode === 'unstyled' && (
				<div className="rounded-lg border bg-muted/40 p-3 space-y-2">
					<FormCheckbox
						label="Apply custom slotProps theme"
						name="useCustomSlotProps"
					/>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Uncheck to inspect bare structural geometry with zero visual utility
						classes.
					</p>
				</div>
			)}

			<SectionHeading>Custom Render Props</SectionHeading>
			<div className="space-y-2.5">
				{RENDER_PROP_TOGGLES.map((toggle) => {
					if (toggle.resourceOnly && !isResource) return null
					return (
						<FormCheckbox
							key={toggle.name}
							label={toggle.label}
							name={toggle.name}
						/>
					)
				})}
			</div>
		</>
	)
}
