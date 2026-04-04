import { memo, useMemo, useRef } from 'react'
import { DayNumber } from '@/components/day-number'
import type { CalendarEvent } from '@/components/types'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { DroppableCell } from './droppable-cell'

const CELL_CLASS =
	'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative border-r last:border-r-0 only:border-r border-b'

interface GridProps {
	day: Dayjs
	hour?: number
	minute?: number
	className?: string
	resourceId?: string | number
	gridType?: 'day' | 'hour'
	shouldRenderEvents?: boolean
	allDay?: boolean
	showDayNumber?: boolean
	children?: React.ReactNode
	'data-testid'?: string
	precomputedEvents?: CalendarEvent[]
}

const NoMemoGridCell: React.FC<GridProps> = ({
	day: rawDay,
	hour,
	minute,
	className = '',
	resourceId,
	precomputedEvents,
	gridType = 'day',
	shouldRenderEvents = true,
	allDay = false,
	'data-testid': dataTestId,
	showDayNumber = false,
	children,
}) => {
	const stableDayRef = useRef(rawDay)
	if (stableDayRef.current.valueOf() !== rawDay.valueOf()) {
		stableDayRef.current = rawDay
	}
	const day = stableDayRef.current

	const {
		currentDate,
		businessHours,
		getResourceById,
		dayMaxEvents = 0,
		t,
		currentLocale,
		eventSpacing,
		openAllEventsDialog,
	} = useSmartCalendarContext()

	const { isCurrentMonth, isBusiness } = useMemo(() => {
		let effectiveBH = businessHours
		if (resourceId && getResourceById) {
			const resource = getResourceById(resourceId)
			if (resource?.businessHours) {
				effectiveBH = resource.businessHours
			}
		}

		return {
			isCurrentMonth: day.month() === currentDate.month(),
			isBusiness: isBusinessHour({
				date: day,
				hour: gridType === 'hour' ? day.hour() : undefined,
				businessHours: effectiveBH,
			}),
		}
	}, [day, currentDate, gridType, businessHours, resourceId, getResourceById])

	const baseTestId = `day-cell-${day.format('YYYY-MM-DD')}`
	const testId =
		gridType === 'hour'
			? `${baseTestId}-${day.format('HH')}-${day.format('mm')}`
			: baseTestId

	const todayEvents = precomputedEvents ?? []
	const hiddenEventsCount = todayEvents.length - dayMaxEvents
	const hasHiddenEvents = shouldRenderEvents && hiddenEventsCount > 0

	return (
		<DroppableCell
			allDay={allDay}
			className={cn(CELL_CLASS, className)}
			data-testid={dataTestId || testId}
			date={day}
			disabled={!isBusiness || !isCurrentMonth}
			hour={hour}
			minute={minute}
			resourceId={resourceId}
			type="day-cell"
		>
			{shouldRenderEvents ? (
				<div
					className="flex flex-col h-full w-full"
					data-testid="grid-cell-content"
					style={{ gap: `${eventSpacing}px` }}
				>
					{showDayNumber && <DayNumber date={day} locale={currentLocale} />}

					{todayEvents.slice(0, dayMaxEvents).map((event, rowIndex) => (
						<div
							className="w-full shrink-0"
							data-testid={event?.title}
							key={`empty-${rowIndex}-${event.id}`}
							style={{ height: `${EVENT_BAR_HEIGHT}px` }}
						/>
					))}

					{hasHiddenEvents && (
						// biome-ignore lint/a11y/useSemanticElements: Using div as button
						<div
							className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] whitespace-nowrap sm:text-xs shrink-0 mt-1"
							onClick={(e) => {
								e.stopPropagation()
								openAllEventsDialog(day, todayEvents)
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									e.stopPropagation()
									openAllEventsDialog(day, todayEvents)
								}
							}}
							role="button"
							tabIndex={0}
						>
							+{hiddenEventsCount} {t('more')}
						</div>
					)}
					{children}
				</div>
			) : (
				children
			)}
		</DroppableCell>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
