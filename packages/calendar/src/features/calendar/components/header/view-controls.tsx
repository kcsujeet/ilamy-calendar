import { Button } from '@ilamy/ui/components/button'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@ilamy/ui/components/tooltip'
import { cn } from '@ilamy/ui/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { CalendarView } from '@/types'

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
	const hasResources = Boolean(resources?.length)
	// Non-selected views are icon-only square buttons (matching the chevrons' row).
	const iconSize = size === 'sm' ? 'icon-sm' : 'icon'

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
			{/* Prev/next live next to the date in the header; the mobile menu (grid)
			    keeps them inline since there's no separate date row there. */}
			{isGrid && (
				<>
					<Button onClick={onPrevious} size={size} variant="outline">
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button onClick={onNext} size={size} variant="outline">
						<ChevronRight className="h-4 w-4" />
					</Button>
				</>
			)}

			{getViews().map((v) => {
				// Resource-incapable views (e.g. year) hide on resource calendars.
				if (hasResources && !v.supportsResources) {
					return null
				}

				const isActive = currentView === v.name
				const label = t(v.label ?? v.name)
				const Icon = v.icon
				const button = (
					<Button
						aria-label={label}
						className={getButtonClassName(v.name)}
						key={v.name}
						onClick={() => onChange(v.name)}
						size={isActive ? size : iconSize}
						variant={getBtnVariant(v.name)}
					>
						<Icon className="h-4 w-4" />
						{isActive && label}
					</Button>
				)

				// The selected view shows its label inline; the rest reveal it on hover.
				if (isActive) {
					return button
				}

				return (
					<Tooltip key={v.name}>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent>{label}</TooltipContent>
					</Tooltip>
				)
			})}

			<Button onClick={onToday} size={size} variant="outline">
				{t('today')}
			</Button>
		</div>
	)
}
