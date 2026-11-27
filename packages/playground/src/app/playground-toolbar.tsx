import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import {
	Calendar,
	Clock,
	Code2,
	Globe2,
	Lock,
	RotateCcw,
	Users,
} from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
	defaultSettings,
	type PlaygroundSettings,
} from '../types/settings-form.types'
import {
	DEMO_PRESETS,
	type DemoPresetId,
	detectActivePreset,
} from './demo-presets.utils'

const PRESET_ICONS: Record<DemoPresetId, typeof Calendar> = {
	standard: Calendar,
	resource: Users,
	'business-hours': Clock,
	'multi-zone': Globe2,
	'read-only': Lock,
}

interface PlaygroundToolbarProps {
	showInspector: boolean
	onToggleInspector: () => void
	logCount: number
	onReset: () => void
	onSelectTab?: (tab: 'general' | 'theme' | 'plugins' | 'schedule') => void
}

export function PlaygroundToolbar({
	showInspector,
	onToggleInspector,
	logCount,
	onReset,
	onSelectTab,
}: PlaygroundToolbarProps) {
	const { control, reset } = useFormContext<PlaygroundSettings>()
	const watched = useWatch({ control })
	const values: PlaygroundSettings = { ...defaultSettings, ...watched }
	const activePreset = detectActivePreset(values)

	const applyPreset = (presetId: DemoPresetId) => {
		const preset = DEMO_PRESETS.find((item) => item.id === presetId)
		if (!preset) {
			return
		}
		reset({ ...values, ...preset.patch })
		if (presetId === 'business-hours') {
			onSelectTab?.('schedule')
		}
	}

	const handleReset = () => {
		reset(defaultSettings)
		onReset()
	}

	return (
		<div className="mb-4 space-y-3">
			{/* Header row: title + utility actions */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-baseline gap-2">
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
							ilamy Calendar Playground
						</h1>
						<span className="font-mono text-xs text-muted-foreground">
							v4.0
						</span>
					</div>
					<p className="text-sm text-muted-foreground mt-0.5">
						Multi-framework calendar with Temporal timezones — works with
						Tailwind, shadcn/ui (Radix &amp; Base UI), MUI, StyleX, or plain CSS
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button
						onClick={onToggleInspector}
						size="sm"
						type="button"
						variant={showInspector ? 'default' : 'outline'}
					>
						<Code2 aria-hidden="true" className="size-4 mr-1.5" />
						Code &amp; Events
						{logCount > 0 && (
							<span className="ml-1.5 font-mono text-[11px] opacity-80">
								({logCount})
							</span>
						)}
					</Button>
					<Button
						onClick={handleReset}
						size="sm"
						title="Reset playground to defaults"
						type="button"
						variant="ghost"
					>
						<RotateCcw aria-hidden="true" className="size-4 mr-1" />
						Reset
					</Button>
				</div>
			</div>

			{/* Scenario tabs: clean flat underline navigation (no nested card or pill clutter) */}
			<nav
				aria-label="Demo presets"
				className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border"
			>
				{DEMO_PRESETS.map((preset) => {
					const Icon = PRESET_ICONS[preset.id]
					const isActive = activePreset === preset.id
					let activeTabClass =
						'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
					if (isActive) {
						activeTabClass = 'border-primary text-foreground'
					}
					return (
						<button
							aria-pressed={isActive}
							className={cn(
								'relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2',
								activeTabClass
							)}
							data-testid={`preset-${preset.id}`}
							key={preset.id}
							onClick={() => applyPreset(preset.id)}
							title={preset.description}
							type="button"
						>
							<Icon aria-hidden="true" className="size-3.5 shrink-0" />
							{preset.label}
						</button>
					)
				})}
			</nav>
		</div>
	)
}
