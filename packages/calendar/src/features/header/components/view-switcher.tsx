import { ToggleGroup, ToggleGroupItem } from '@ilamy/ui/components/toggle-group'
import { cn } from '@ilamy/ui/lib/utils'
import { useHeaderViews } from '@/features/header/hooks/use-header-views'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'

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
	const inactiveSlot = useSlotProps('viewButton', {
		structuralClassName: 'rounded-md px-3',
		defaultClassName:
			'text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground font-medium data-[state=on]:shadow-sm',
	})
	const activeSlot = useSlotProps('viewButtonActive', {
		structuralClassName: 'rounded-md px-3',
		defaultClassName:
			'text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground font-medium data-[state=on]:shadow-sm',
	})
	const views = useHeaderViews()

	return (
		<ToggleGroup
			aria-label="Calendar view"
			className={cn('bg-muted gap-0 rounded-lg p-0.75', className)}
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
