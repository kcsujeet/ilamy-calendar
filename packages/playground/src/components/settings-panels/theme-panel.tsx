import { cn } from '@ilamy/ui/lib/utils'
import { useFormContext, useWatch } from 'react-hook-form'
import type { PlaygroundSettings, ThemeAccent } from '../../types/settings-form'
import { THEME_ACCENTS } from '../../utils/demo-themes'
import { FormButtonGroup } from '../form/form-button-group'
import { FormCheckbox } from '../form/form-checkbox'
import { SectionHeading } from './settings-fields'
import { THEME_MODE_OPTIONS } from './settings-options'

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
	const themePreset = useWatch({ control, name: 'themePreset' })
	const themeAccent = useWatch({ control, name: 'themeAccent' })
	const calendarType = useWatch({ control, name: 'calendarType' })
	const isResource = calendarType === 'resource'
	const supportsPalette = themePreset === 'mui' || themePreset === 'stylex'

	return (
		<>
			<SectionHeading>Theme Customization</SectionHeading>
			{themePreset === 'tailwind' && (
				<p className="text-xs text-muted-foreground leading-relaxed">
					Tailwind / Shadcn tokens are active. Switch themes in the preview bar
					to customize MUI, StyleX, or Unstyled options.
				</p>
			)}

			{themePreset !== 'tailwind' && (
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

			{themePreset === 'unstyled' && (
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
