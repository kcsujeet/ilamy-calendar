import { useDroppable } from '@dnd-kit/core'
import type { IsoDateString, VerticalColumnSpec } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	parseDate,
	resolveZone,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { memo, useId, useMemo } from 'react'
import { GridCell } from '@/features/views/components/grid-cell/grid-cell'
import { VerticalGridEventsLayer } from '@/features/views/components/vertical-grid/events-layer/vertical-grid-events-layer'
import type { StickyInsetSide } from '@/features/views/hooks/use-sticky-insets'
import { useDragPreviewEvent } from '@/hooks/use-drag-preview-event'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarTheme } from '@/stores/calendar-theme-context'
import {
	type DragPreviewState,
	useDragPreview,
} from '@/stores/drag-preview-context'
import type { DropColumnData } from '@/utils/dnd.utils'
import { keys } from '@/utils/keys.utils'

export interface VerticalGridColProps extends VerticalColumnSpec {
	'data-testid'?: string
	'data-sticky-inset'?: StickyInsetSide
	slotDurationMinutes?: number
}

const getSlotOffsets = (slotDurationMinutes: number): number[] =>
	Array.from(
		{ length: Math.floor(60 / slotDurationMinutes) },
		(_, i) => i * slotDurationMinutes
	)

interface ParsedDayEntry {
	iso: IsoDateString
	zoned: ZonedDate
}

interface ColumnRowsProps {
	id: string
	entries: ParsedDayEntry[]
	gridType?: 'day' | 'hour'
	renderCell?: (date: IsoDateString) => React.ReactNode
	resourceId?: string | number
	slotDurationMinutes: number
	slots: DropColumnData['slots']
	dragPreview: DragPreviewState | null
}

const NoMemoColumnRows: React.FC<ColumnRowsProps> = ({
	id,
	entries,
	gridType,
	renderCell,
	resourceId,
	slotDurationMinutes,
	slots,
	dragPreview,
}) => {
	const cellOffsets = getSlotOffsets(slotDurationMinutes)
	const hasSubHourSlots = cellOffsets.length > 1
	return (
		<>
			{entries.map(({ iso, zoned }, dayIndex) => {
				const hourStr = String(zoned.hour).padStart(2, '0')

				if (renderCell) {
					const isTimeGutter = id === keys.col.time
					const testId = isTimeGutter
						? keys.cell.verticalTime(hourStr)
						: keys.cell.vertical(zoned, hourStr, '00', resourceId)
					return (
						<div
							className="min-h-[60px] bg-background"
							data-hour={isTimeGutter ? hourStr : undefined}
							data-testid={testId}
							key={keys.listKey(dayIndex, hourStr)}
						>
							{renderCell(iso)}
						</div>
					)
				}

				return (
					<div
						className="flex flex-col min-h-[60px]"
						key={keys.listKey(dayIndex, hourStr)}
					>
						{cellOffsets.map((minute, offsetIndex) => {
							const mm = String(minute).padStart(2, '0')
							const testId = keys.cell.vertical(zoned, hourStr, mm, resourceId)
							const isSubDivider =
								hasSubHourSlots && offsetIndex < cellOffsets.length - 1

							return (
								<GridCell
									axis="vertical"
									className={cn(
										'not-in-data-dragging:hover:bg-accent relative z-10 flex-1 min-h-0 cursor-pointer',
										isSubDivider && 'border-b border-dashed'
									)}
									data-testid={testId}
									day={hasSubHourSlots ? withTime(zoned, { minute }) : zoned}
									dragPreview={dragPreview}
									dropSlots={slots}
									gridType={gridType}
									hour={gridType === 'hour' ? zoned.hour : undefined}
									isSubDivider={isSubDivider}
									key={keys.listKey(dayIndex, mm)}
									minute={hasSubHourSlots ? minute : undefined}
									resourceId={resourceId}
									shouldRenderEvents={false}
									slotDurationMinutes={slotDurationMinutes}
									slotIndex={dayIndex * cellOffsets.length + offsetIndex}
								/>
							)
						})}
					</div>
				)
			})}
		</>
	)
}

const ColumnRows = memo(NoMemoColumnRows)

const parseColumnEntries = (
	days: IsoDateString[],
	zone: string
): ParsedDayEntry[] => {
	const parsed: ParsedDayEntry[] = []
	for (const iso of days) {
		const zoned = parseDate(iso, zone)
		if (zoned) {
			parsed.push({ iso, zoned })
		}
	}
	return parsed
}

const createEmptySlots = (count: number): DropColumnData['slots'] =>
	Array.from({ length: count }, () => undefined)

const useColumnGridData = (
	days: IsoDateString[],
	slotDurationMinutes: number
) => {
	const timezone = useSmartCalendarContext((c) => c.timezone)
	const zone = resolveZone(timezone)
	const entries = useMemo<ParsedDayEntry[]>(
		() => parseColumnEntries(days, zone),
		[days, zone]
	)
	const zonedDays = useMemo(
		() => entries.map((entry) => entry.zoned),
		[entries]
	)
	const totalSlots = entries.length * getSlotOffsets(slotDurationMinutes).length
	const slots = useMemo<DropColumnData['slots']>(
		() => createEmptySlots(totalSlots),
		[totalSlots]
	)
	return { entries, zonedDays, slots }
}

const NoMemoVerticalGridCol: React.FC<VerticalGridColProps> = ({
	id,
	days,
	resource,
	'data-testid': dataTestId,
	'data-sticky-inset': stickyInset,
	gridType,
	className,
	renderCell,
	noEvents,
	slotDurationMinutes = 60,
}) => {
	const { unstyled } = useCalendarTheme()
	const resourceId = resource?.id
	const { entries, zonedDays, slots } = useColumnGridData(
		days,
		slotDurationMinutes
	)
	const dragPreview = useDragPreview()
	const previewEvent = useDragPreviewEvent({
		days: zonedDays,
		gridType: gridType ?? 'hour',
		resourceId,
	})
	const dragLandsOnColumn = previewEvent !== null
	const columnDragPreview = dragLandsOnColumn ? dragPreview : null

	const { setNodeRef } = useDroppable({
		id: useId(),
		data: { slots },
		disabled: renderCell !== undefined,
	})

	return (
		<div
			className={cn(
				'flex flex-col flex-1 items-center min-w-20 justify-center relative',
				!unstyled && 'bg-background',
				className
			)}
			data-sticky-inset={stickyInset}
			data-testid={dataTestId || keys.container.vertical.col(id)}
		>
			<div
				className={cn(
					'w-full h-full relative grid',
					!unstyled && 'gap-px bg-border'
				)}
				ref={setNodeRef}
				style={{
					gridTemplateRows: `repeat(${entries.length}, minmax(0, 1fr))`,
				}}
			>
				<ColumnRows
					dragPreview={columnDragPreview}
					entries={entries}
					gridType={gridType}
					id={id}
					renderCell={renderCell}
					resourceId={resourceId}
					slotDurationMinutes={slotDurationMinutes}
					slots={slots}
				/>

				{!noEvents && (
					<div className="absolute inset-0 z-10 pointer-events-none">
						<VerticalGridEventsLayer
							data-testid={keys.container.eventsLayer('vertical', id)}
							days={zonedDays}
							gridType={gridType}
							resource={resource}
							resourceId={resourceId}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export const VerticalGridCol = memo(
	NoMemoVerticalGridCol
) as typeof NoMemoVerticalGridCol
