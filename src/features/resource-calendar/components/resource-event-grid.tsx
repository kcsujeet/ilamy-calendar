import { ScrollArea, ScrollBar } from '@/components/ui'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { AnimatePresence, motion } from 'motion/react'
import { ResourceEventsLayer } from './resource-events-layer'
import { GridCell } from '@/components/grid-cell'

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
}

export const ResourceEventGrid: React.FC<ResourceEventGridProps> = ({
  days,
  gridType = 'day',
  children,
}) => {
  const { currentDate, getVisibleResources, dayMaxEvents } =
    useResourceCalendarContext()

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
      {children}

      {/* Calendar area with scroll */}
      <div className="flex flex-1 h-[calc(100%-3rem)] w-fit">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDate.format('YYYY-MM')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative w-full flex flex-col"
          >
            {rows.map((row) => (
              <div key={row.id} className="flex flex-1 relative min-h-[60px] ">
                <div className="w-40 border-b border-r p-2 flex flex-shrink-0 sticky left-0 bg-background z-20">
                  <div className="break-words text-sm">{row.title}</div>
                </div>

                <div className="relative flex-1 flex">
                  {row.cells.map((cell) => (
                    <GridCell
                      key={cell.id}
                      index={cell.value.day()}
                      day={cell.value}
                      resourceId={row.id}
                      dayMaxEvents={dayMaxEvents}
                      gridType={gridType}
                      className="border-r border-b w-20"
                    />
                  ))}

                  {/* Events layer positioned absolutely over the resource row */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <ResourceEventsLayer
                      days={days}
                      resourceId={row.id}
                      gridType={gridType}
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
