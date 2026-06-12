import { Button } from '@ilamy/ui/components/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import type { CalendarView } from '@/types'

// Phase 4 deletes this allowlist: the resource-calendar feature still forks
// day/week/month, so those built-ins stay visible on resource calendars even
// though their core specs ship supportsResources: false until Phase 4 flips
// them. Year stays hidden — the general rule already encodes the old
// hardcoded year suppression.
const RESOURCE_FORK_VIEWS = new Set(['day', 'week', 'month'])

interface ViewControlsProps {
	currentView: CalendarView
	onChange: (view: CalendarView) => void
	onToday?: () => void
	onNext?: () => void
	onPrevious?: () => void
	variant?: 'default' | 'grid'
	size?: 'sm' | 'default'
	className?: string
}

export const ViewControls: React.FC<ViewControlsProps> = ({
	currentView,
	onChange,
	variant = 'default',
	size = 'sm',
	className,
	onToday,
	onNext,
	onPrevious,
}) => {
	const { t, resources, getViews } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources,
		getViews: context.getViews,
	}))
	const isGrid = variant === 'grid'
	const isResourceCalendar = resources && resources.length > 0

	// Extract common button className logic to a function
	const getButtonClassName = (viewType: CalendarView) => {
		return cn(
			// Base width for grid layout
			isGrid ? 'w-full' : '',
			// Active view styling
			currentView === viewType && 'bg-primary/80'
		)
	}

	const getBtnVariant = (viewType: CalendarView) => {
		return currentView === viewType ? 'default' : 'outline'
	}

	return (
		<div
			className={cn(
				isGrid ? 'grid grid-cols-2 gap-2' : 'flex gap-1',
				className
			)}
		>
			<Button onClick={onPrevious} size={size} variant="outline">
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<Button onClick={onNext} size={size} variant="outline">
				<ChevronRight className="h-4 w-4" />
			</Button>

			{getViews().map((v) => {
				const resourceCapable =
					Boolean(v.supportsResources) || RESOURCE_FORK_VIEWS.has(v.name)
				if (isResourceCalendar && !resourceCapable) {
					return null
				}

				return (
					<Button
						className={getButtonClassName(v.name)}
						key={v.name}
						onClick={() => onChange(v.name)}
						size={size}
						variant={getBtnVariant(v.name)}
					>
						{t(v.label ?? v.name)}
					</Button>
				)
			})}

			<Button onClick={onToday} size={size} variant="outline">
				{t('today')}
			</Button>
		</div>
	)
}
