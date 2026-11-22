import { ToggleGroup, ToggleGroupItem } from '@ilamy/ui/components/toggle-group'
import { cn } from '@ilamy/ui/lib/utils'
import { useHeaderViews } from '@/features/header/hooks/use-header-views'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarTheme, useSlotProps } from '@/stores/calendar-theme-context'

interface ViewSwitcherProps {
	className?: string
}

// Desktop segmented control listing the available views (Day/Week/Month/...).
export function ViewSwitcher({ className }: ViewSwitcherProps) {
	const { view, setView, t } = useSmartCalendarContext((ctx) => ({
		view: ctx.view,
		setView: ctx.setView,
		t: ctx.t,
	}))
	const { unstyled, slotProps } = useCalendarTheme()
	const hasThemedViewButtons = Boolean(
		slotProps.viewButton || slotProps.viewButtonActive
	)
	let viewButtonStructuralClass: string | undefined
	if (hasThemedViewButtons) {
		viewButtonStructuralClass = 'h-full inline-flex items-center'
	}
	const inactiveSlot = useSlotProps('viewButton', {
		structuralClassName: viewButtonStructuralClass,
		defaultClassName:
			'h-full rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground font-medium data-[state=on]:shadow-sm',
	})
	const activeSlot = useSlotProps('viewButtonActive', {
		structuralClassName: viewButtonStructuralClass,
		defaultClassName:
			'h-full rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground font-medium data-[state=on]:shadow-sm',
	})
	const views = useHeaderViews()

	if (unstyled) {
		return (
			<div
				aria-label="Calendar view"
				className={cn(
					'flex items-center gap-0.5',
					hasThemedViewButtons && 'bg-muted h-9 rounded-lg p-0.75',
					className
				)}
				role="group"
			>
				{views.map((v) => {
					const isActive = v.name === view
					const slot = isActive ? activeSlot : inactiveSlot
					return (
						<button
							aria-pressed={isActive}
							className={slot.className}
							data-state={isActive ? 'on' : 'off'}
							key={v.name}
							onClick={() => setView(v.name)}
							style={slot.style}
							type="button"
						>
							{t(v.label ?? v.name)}
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<ToggleGroup
			aria-label="Calendar view"
			className={cn('bg-muted h-9 gap-0 rounded-lg p-0.75', className)}
			onValueChange={(next) => next && setView(next)}
			size="sm"
			type="single"
			value={view}
		>
			{views.map((v) => {
				const isActive = v.name === view
				const slot = isActive ? activeSlot : inactiveSlot
				return (
					<ToggleGroupItem
						className={slot.className}
						key={v.name}
						style={slot.style}
						value={v.name}
					>
						{t(v.label ?? v.name)}
					</ToggleGroupItem>
				)
			})}
		</ToggleGroup>
	)
}
