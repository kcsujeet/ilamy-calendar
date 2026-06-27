import { Button } from '@ilamy/ui/components/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@ilamy/ui/components/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useHeaderViews } from './use-header-views'

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
	const views = useHeaderViews()
	const current = views.find((v) => v.name === view)
	const currentLabel = current ? t(current.label ?? current.name) : ''
	const CurrentIcon = current?.icon

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className={className}>
				<Button size="default" variant="outline">
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
	)
}
