import { CardHeader } from '@ilamy/ui/components/card'
import { cn } from '@ilamy/ui/lib/utils'
import { Blocks, Layers, Palette } from 'lucide-react'
import {
	FRAMEWORK_OPTIONS,
	type FrameworkId,
	type ThemePreset,
} from '../types/settings-form'

interface ThemeOption {
	value: ThemePreset
	label: string
	reactOnly?: boolean
}

const THEME_ICONS: Record<ThemePreset, typeof Palette> = {
	unstyled: Layers,
	tailwind: Blocks,
	mui: Palette,
	stylex: Palette,
}

const THEME_OPTIONS: ThemeOption[] = [
	{ value: 'unstyled', label: 'Unstyled' },
	{ value: 'tailwind', label: 'Tailwind' },
	{ value: 'mui', label: 'MUI', reactOnly: true },
	{ value: 'stylex', label: 'StyleX' },
]

interface PreviewHeaderBarProps {
	framework: FrameworkId
	themePreset: ThemePreset
	onSelectFramework: (framework: FrameworkId) => void
	onSelectTheme: (theme: ThemePreset) => void
}

export function PreviewHeaderBar({
	framework,
	themePreset,
	onSelectFramework,
	onSelectTheme,
}: PreviewHeaderBarProps) {
	const isReact = framework === 'react'

	return (
		<CardHeader className="px-3 py-2 border-b flex flex-row flex-wrap items-center justify-between gap-2 bg-muted/30">
			<fieldset className="inline-flex flex-nowrap overflow-x-auto max-w-full items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0">
				<legend className="sr-only">Framework switcher</legend>
				{FRAMEWORK_OPTIONS.map((fw) => {
					const isActive = framework === fw.value
					let buttonTone = 'text-muted-foreground hover:text-foreground'
					let versionTone = 'text-muted-foreground'
					if (isActive) {
						buttonTone = 'bg-primary text-primary-foreground shadow-xs'
						versionTone = 'text-primary-foreground/80'
					}
					return (
						<button
							aria-pressed={isActive}
							className={cn(
								'inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
								buttonTone
							)}
							data-testid={`framework-${fw.value}`}
							key={fw.value}
							onClick={() => onSelectFramework(fw.value)}
							type="button"
						>
							<span>{fw.label}</span>
							<span className={cn('font-mono text-[10px]', versionTone)}>
								{fw.version}
							</span>
						</button>
					)
				})}
			</fieldset>

			<fieldset className="inline-flex flex-nowrap overflow-x-auto max-w-full items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0">
				<legend className="sr-only">Theme switcher</legend>
				{THEME_OPTIONS.map((option) => {
					const isActive = themePreset === option.value
					const isDisabled = Boolean(option.reactOnly && !isReact)
					const Icon = THEME_ICONS[option.value]
					let cursorTone = 'cursor-pointer'
					let activeTone = 'text-muted-foreground hover:text-foreground'
					let disabledTitle: string | undefined
					if (isDisabled) {
						cursorTone = 'opacity-40 cursor-not-allowed text-muted-foreground'
						activeTone = ''
						disabledTitle =
							'Material UI adapter is React-only; try Tailwind, StyleX, or Unstyled'
					} else if (isActive) {
						activeTone = 'bg-primary text-primary-foreground shadow-xs'
					}
					return (
						<button
							aria-pressed={isActive}
							className={cn(
								'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
								cursorTone,
								activeTone
							)}
							data-testid={`theme-${option.value}`}
							disabled={isDisabled}
							key={option.value}
							onClick={() => onSelectTheme(option.value)}
							title={disabledTitle}
							type="button"
						>
							<Icon aria-hidden="true" className="size-3.5 shrink-0" />
							{option.label}
						</button>
					)
				})}
			</fieldset>
		</CardHeader>
	)
}
