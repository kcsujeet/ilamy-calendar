import { ToggleGroup, ToggleGroupItem } from '@ilamy/ui/components/toggle-group'
import { cn } from '@ilamy/ui/lib/utils'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useHeaderViews } from './use-header-views'

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
	const views = useHeaderViews()

	return (
		<ToggleGroup
			// p-0.5 track + sm (h-8) items = h-9 total: the active pill sits inset
			// inside the muted track while the control still matches the h-9 buttons.
			className={cn('bg-muted gap-0 rounded-lg p-0.75', className)}
			onValueChange={(next) => next && setView(next)}
			size="sm"
			type="single"
			value={view}
		>
			{views.map((v) => (
				<ToggleGroupItem
					className="text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground rounded-md px-3 font-medium data-[state=on]:shadow-sm"
					key={v.name}
					value={v.name}
				>
					{t(v.label ?? v.name)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
