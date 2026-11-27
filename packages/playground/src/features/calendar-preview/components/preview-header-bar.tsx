import { CardHeader } from '../../../components/ui/card'
import { cn } from '../../../lib/utils'
import {
	COMPONENT_LIBRARY_OPTIONS,
	CSS_MODE_OPTIONS,
	type ComponentLibraryId,
	type CssMode,
	FRAMEWORK_OPTIONS,
	type FrameworkId,
} from '../../../types/settings-form.types'

interface PreviewHeaderBarProps {
	framework: FrameworkId
	cssMode: CssMode
	componentLibrary: ComponentLibraryId
	onSelectFramework: (framework: FrameworkId) => void
	onSelectCss: (cssMode: CssMode) => void
	onSelectComponentLibrary: (library: ComponentLibraryId) => void
}

const BUTTON_BASE =
	'inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors min-h-6'
const BUTTON_ACTIVE =
	'bg-primary text-primary-foreground shadow-xs cursor-pointer'
const BUTTON_INACTIVE =
	'text-muted-foreground hover:text-foreground cursor-pointer'
const BUTTON_DISABLED = 'opacity-40 cursor-not-allowed text-muted-foreground'

const AxisLabel = ({ children }: { children: string }) => (
	<span className="text-[11px] font-medium text-muted-foreground select-none px-1">
		{children}
	</span>
)

export function PreviewHeaderBar({
	framework,
	cssMode,
	componentLibrary,
	onSelectFramework,
	onSelectCss,
	onSelectComponentLibrary,
}: PreviewHeaderBarProps) {
	return (
		<CardHeader
			className="px-3 py-2 border-b flex flex-row flex-wrap items-center justify-between gap-2 bg-muted/30"
			data-testid="playground-axes-bar"
		>
			<div className="flex flex-wrap items-center gap-1.5 min-w-0">
				<AxisLabel>Framework</AxisLabel>
				<fieldset className="inline-flex flex-wrap items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0">
					<legend className="sr-only">Framework</legend>
					{FRAMEWORK_OPTIONS.map((fw) => {
						const isActive = framework === fw.value
						return (
							<button
								aria-pressed={isActive}
								className={cn(
									BUTTON_BASE,
									isActive ? BUTTON_ACTIVE : BUTTON_INACTIVE
								)}
								data-testid={`framework-${fw.value}`}
								key={fw.value}
								onClick={() => onSelectFramework(fw.value)}
								type="button"
							>
								<span>{fw.label}</span>
								<span
									className={cn(
										'font-mono text-[10px]',
										isActive
											? 'text-primary-foreground/80'
											: 'text-muted-foreground'
									)}
								>
									{fw.version}
								</span>
							</button>
						)
					})}
				</fieldset>
			</div>

			<div className="flex flex-wrap items-center gap-2 min-w-0">
				<div className="flex flex-wrap items-center gap-1.5 min-w-0">
					<AxisLabel>CSS</AxisLabel>
					<fieldset className="inline-flex flex-wrap items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0">
						<legend className="sr-only">CSS</legend>
						{CSS_MODE_OPTIONS.map((option) => {
							const isActive = cssMode === option.value
							return (
								<button
									aria-pressed={isActive}
									className={cn(
										BUTTON_BASE,
										isActive ? BUTTON_ACTIVE : BUTTON_INACTIVE
									)}
									data-testid={`css-${option.value}`}
									key={option.value}
									onClick={() => onSelectCss(option.value)}
									title={option.description}
									type="button"
								>
									{option.label}
								</button>
							)
						})}
					</fieldset>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 min-w-0">
					<AxisLabel>Components</AxisLabel>
					<fieldset className="inline-flex flex-wrap items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0">
						<legend className="sr-only">Components</legend>
						{COMPONENT_LIBRARY_OPTIONS.map((option) => {
							const isSupported = option.supportedFrameworks.includes(framework)
							const isActive = componentLibrary === option.value
							let tone = BUTTON_INACTIVE
							if (!isSupported) {
								tone = BUTTON_DISABLED
							} else if (isActive) {
								tone = BUTTON_ACTIVE
							}
							return (
								<button
									aria-pressed={isActive}
									className={cn(BUTTON_BASE, tone)}
									data-testid={`components-${option.value}`}
									disabled={!isSupported}
									key={option.value}
									onClick={() => onSelectComponentLibrary(option.value)}
									title={isSupported ? undefined : option.disabledReason}
									type="button"
								>
									{option.label}
								</button>
							)
						})}
					</fieldset>
				</div>
			</div>
		</CardHeader>
	)
}
