import { ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { Button } from '@/components/ui/button'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

type ViewType = 'day' | 'week' | 'month' | 'year'
const AVAILABLE_VIEWS: ViewType[] = ['day', 'week', 'month', 'year']

interface ViewControlsProps {
	currentView: ViewType
	onChange: (view: ViewType) => void
	onToday?: () => void
	onNext?: () => void
	onPrevious?: () => void
	variant?: 'default' | 'grid'
	size?: 'sm' | 'default'
	className?: string
}

const ViewControls: React.FC<ViewControlsProps> = ({
	currentView,
	onChange,
	variant = 'default',
	size = 'sm',
	className,
	onToday,
	onNext,
	onPrevious,
}) => {
	const { t, resources } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources,
	}))
	const isGrid = variant === 'grid'
	const isResourceCalendar = resources && resources.length > 0

	// Extract common button className logic to a function
	const getButtonClassName = (viewType: ViewType) => {
		return cn(
			// Base width for grid layout
			isGrid ? 'w-full' : '',
			// Active view styling
			currentView === viewType && 'bg-primary/80'
		)
	}

	const getBtnVariant = (viewType: ViewType) => {
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

			{AVAILABLE_VIEWS.map((type: ViewType) => {
				if (isResourceCalendar && type === 'year') {
					return null
				}

				return (
					<Button
						className={getButtonClassName(type)}
						key={type}
						onClick={() => onChange(type)}
						size={size}
						variant={getBtnVariant(type)}
					>
						{t(type)}
					</Button>
				)
			})}

			<Button onClick={onToday} size={size} variant="outline">
				{t('today')}
			</Button>
		</div>
	)
}

export default ViewControls
