import { Card, CardHeader, CardTitle } from '@ilamy/ui/components/card'
import { cn } from '@ilamy/ui/lib/utils'
import { CalendarClock, Palette, Puzzle, SlidersHorizontal } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react'

export type SettingsTabId = 'general' | 'theme' | 'plugins' | 'schedule'

interface SettingsTabDef {
	id: SettingsTabId
	label: string
	icon: typeof SlidersHorizontal
}

const SETTINGS_TABS: SettingsTabDef[] = [
	{ id: 'general', label: 'General', icon: SlidersHorizontal },
	{ id: 'theme', label: 'Theme', icon: Palette },
	{ id: 'plugins', label: 'Plugins', icon: Puzzle },
	{ id: 'schedule', label: 'Schedule', icon: CalendarClock },
]

interface SettingsTabsProps {
	activeTab: SettingsTabId
	onTabChange: (tab: SettingsTabId) => void
	panels: Record<SettingsTabId, ReactNode>
	className?: string
}

const TAB_KEY_HANDLERS: Record<
	string,
	(index: number, count: number) => number
> = {
	ArrowRight: (index, count) => (index + 1) % count,
	ArrowLeft: (index, count) => (index - 1 + count) % count,
	Home: () => 0,
	End: (_index, count) => count - 1,
}

/**
 * Accessible single-row tabbed settings card:
 * - Keyboard ArrowLeft/ArrowRight/Home/End roving tabindex on `role="tablist"`
 * - `aria-selected` border underline (not color-only, WCAG 1.4.1 / Forced Colors)
 * - Standard `hidden` on inactive `role="tabpanel"` elements with inner spacing wrapper
 */
export function SettingsTabs({
	activeTab,
	onTabChange,
	panels,
	className,
}: SettingsTabsProps) {
	const idPrefix = useId()
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

	const handleTabKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		index: number
	) => {
		const resolveNext = TAB_KEY_HANDLERS[event.key]
		if (!resolveNext) return

		const nextIndex = resolveNext(index, SETTINGS_TABS.length)
		event.preventDefault()
		const nextTab = SETTINGS_TABS.at(nextIndex)
		if (!nextTab) return
		onTabChange(nextTab.id)
		tabRefs.current.at(nextIndex)?.focus()
	}

	return (
		<Card
			className={cn(
				'border bg-background shadow-sm overflow-clip gap-0 flex flex-col',
				className
			)}
		>
			<CardHeader className="p-0 border-b shrink-0">
				<div className="px-4 pt-3 pb-1 flex items-center justify-between">
					<CardTitle className="text-sm font-semibold tracking-tight">
						Inspector
					</CardTitle>
					<span className="text-[11px] text-muted-foreground">Live props</span>
				</div>

				{/* Single-row 4-tab strip — every tab visible without clipping */}
				<div
					aria-label="Calendar settings"
					className="grid grid-cols-4 px-1"
					role="tablist"
				>
					{SETTINGS_TABS.map((tab, index) => {
						const Icon = tab.icon
						const isSelected = activeTab === tab.id
						const tabId = `${idPrefix}-tab-${tab.id}`
						return (
							<button
								aria-selected={isSelected}
								className={cn(
									'relative inline-flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap',
									'text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
									'aria-selected:text-foreground aria-selected:after:content-[""] aria-selected:after:absolute aria-selected:after:inset-x-1 aria-selected:after:bottom-0 aria-selected:after:border-b-2 aria-selected:after:border-primary'
								)}
								data-testid={`settings-tab-${tab.id}`}
								id={tabId}
								key={tab.id}
								onClick={() => onTabChange(tab.id)}
								onKeyDown={(event) => handleTabKeyDown(event, index)}
								ref={(node) => {
									tabRefs.current[index] = node
								}}
								role="tab"
								tabIndex={isSelected ? 0 : -1}
								type="button"
							>
								<Icon aria-hidden="true" className="size-3.5 shrink-0" />
								{tab.label}
							</button>
						)
					})}
				</div>
			</CardHeader>

			{/* Scrollable tab panel viewport so controls never push the calendar off-screen */}
			<div className="overflow-y-auto flex-1 min-h-0">
				{SETTINGS_TABS.map((tab) => {
					const isSelected = activeTab === tab.id
					const tabId = `${idPrefix}-tab-${tab.id}`
					return (
						<div
							aria-labelledby={tabId}
							hidden={!isSelected}
							key={tab.id}
							role="tabpanel"
						>
							<div className="p-4 space-y-4">{panels[tab.id]}</div>
						</div>
					)
				})}
			</div>
		</Card>
	)
}
