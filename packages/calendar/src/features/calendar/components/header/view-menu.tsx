import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@ilamy/ui/components/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { useHeaderViews } from '@/features/calendar/hooks/use-header-views'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	useCalendarComponents,
	useSlotProps,
} from '@/features/calendar/stores/calendar-theme-context'

interface ViewMenuProps {
	className?: string
}

// Compact view picker (tablet/phone): a dropdown showing the current view, with
// a checkmark on the active one. Collapses the desktop segmented switcher.
export function ViewMenu({ className }: ViewMenuProps) {
	const { view, setView, t } = useSmartCalendarContext((ctx) => ({
		view: ctx.view,
		setView: ctx.setView,
		t: ctx.t,
	}))
	const { Button } = useCalendarComponents()
	const viewButtonSlot = useSlotProps('viewButton')
	const views = useHeaderViews()
	const current = views.find((v) => v.name === view)
	const currentLabel = current ? t(current.label ?? current.name) : ''
	const CurrentIcon = current?.icon

	return (
		<div className={className}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className={viewButtonSlot.className}
						size="default"
						style={viewButtonSlot.style}
						type="button"
						variant="outline"
					>
						{CurrentIcon && <CurrentIcon className="size-4" />}
						<span>{currentLabel}</span>
						<ChevronDown className="size-4 opacity-50" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-40">
					{views.map((v) => {
						const Icon = v.icon
						return (
							<DropdownMenuItem key={v.name} onSelect={() => setView(v.name)}>
								<Icon className="size-4" />
								<span className="flex-1">{t(v.label ?? v.name)}</span>
								{v.name === view && <Check className="size-4" />}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
