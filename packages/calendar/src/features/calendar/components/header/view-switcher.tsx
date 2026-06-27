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
			className={cn('bg-muted gap-0 rounded-lg', className)}
			onValueChange={(next) => next && setView(next)}
			size="default"
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
