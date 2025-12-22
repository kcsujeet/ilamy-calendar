import { GridCell } from '@/components/grid-cell'
import { ResourceCell } from '@/components/resource-cell'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { ResourceEventsLayer } from './resource-events-layer'

interface ResourceEventGridProps {
	/**
	 * Array of days to display in the grid
	 */
	days: dayjs.Dayjs[]
	/** The type of grid to display - 'day' for day view, 'hour' for week view
	 * (affects event positioning logic)
	 */
	gridType?: 'day' | 'hour'
	/**
	 * Children will be rendered as headers above the grid
	 * (e.g., for day names in month view)
	 */
	children?: React.ReactNode
	classes?: { header?: string; cell?: string }
}

export const ResourceEventGrid: React.FC<ResourceEventGridProps> = ({
	days,
	gridType = 'day',
	children,
	classes,
}) => {
	const {
		currentDate,
		getVisibleResources,
		dayMaxEvents,
		renderResource,
		stickyViewHeader,
		viewHeaderClassName,
	} = useResourceCalendarContext()

	const visibleResources = getVisibleResources()

	const rows = visibleResources.map((resource) => ({
		id: resource.id,
		title: resource.title,
		resource: resource,
		cells: days.map((day) => ({
			label: day.format('D'),
			value: day,
			id: day.toISOString(),
		})),
	}))

	return (
		<ScrollArea
			className="h-full"
			data-testid="month-scroll-area"
			viewPortProps={{ className: '*:flex! *:flex-col! *:min-h-full' }}
		>
			{/* header row */}
			<div
				className={cn(
					'flex h-12 w-fit',
					stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
					classes?.header,
					viewHeaderClassName
				)}
			>
				{children}
			</div>
			{/* Calendar area with scroll */}
			<div className="flex flex-1 h-[calc(100%-3rem)] w-fit">
				<div
					className="relative w-full flex flex-col"
					key={currentDate.format('YYYY-MM')}
				>
					{rows.map((row) => (
						<div className="flex flex-1 relative min-h-[60px] " key={row.id}>
							<ResourceCell
								className="w-40 sticky left-0 z-20 shrink-0"
								resource={row.resource}
							>
								{renderResource ? (
									renderResource(row.resource)
								) : (
									<div className="wrap-break-word text-sm">{row.title}</div>
								)}
							</ResourceCell>
							<div className="relative flex-1 flex">
								{row.cells.map((cell) => (
									<GridCell
										className="border-r border-b w-20"
										day={cell.value}
										dayMaxEvents={dayMaxEvents}
										gridType={gridType}
										index={cell.value.day()}
										key={cell.id}
										resourceId={row.id}
									/>
								))}

								{/* Events layer positioned absolutely over the resource row */}
								<div className="absolute inset-0 z-10 pointer-events-none">
									<ResourceEventsLayer
										days={days}
										gridType={gridType}
										resourceId={row.id}
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
			<ScrollBar className="z-30" /> {/* vertical scrollbar */}
			<ScrollBar className="z-30" orientation="horizontal" />{' '}
			{/* horizontal scrollbar */}
		</ScrollArea>
	)
}
