import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { downloadICalendar } from '@/lib/utils/export-ical'
import { Calendar as CalendarIcon, Download, Menu, Plus } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import TitleContent from './title-content'
import ViewControls from './view-controls'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib'

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const {
    view,
    setView,
    nextPeriod,
    prevPeriod,
    today,
    openEventForm,
    headerComponent,
    headerClassName,
    rawEvents,
    t,
  } = useSmartCalendarContext((context) => ({
    view: context.view,
    setView: context.setView,
    nextPeriod: context.nextPeriod,
    prevPeriod: context.prevPeriod,
    today: context.today,
    openEventForm: context.openEventForm,
    headerComponent: context.headerComponent,
    headerClassName: context.headerClassName,
    rawEvents: context.rawEvents,
    t: context.t,
  }))

  // State for mobile menu popover
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false)

  // Handle view change with optional popover closing
  const handleViewChange = (
    newView: 'day' | 'week' | 'month' | 'year',
    closePopover = false
  ) => {
    setView(newView)
    if (closePopover) {
      setMobilePopoverOpen(false)
    }
  }

  // Handle iCalendar export
  const handleExport = useCallback(() => {
    const filename = `ilamy-calendar-${new Date().toISOString().split('T')[0]}.ics`
    downloadICalendar(rawEvents, filename, 'ilamy Calendar')
    setMobilePopoverOpen(false)
  }, [rawEvents])

  // Callback for navigation that also closes the mobile popover
  const handleNavigation = {
    today: () => {
      today()
      setMobilePopoverOpen(false)
    },
    previous: () => {
      prevPeriod()
      setMobilePopoverOpen(false)
    },
    next: () => {
      nextPeriod()
      setMobilePopoverOpen(false)
    },
  }

  const NewEventButton = useCallback(
    () => (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => openEventForm()}
          variant="default"
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden @4xl:inline">{t('new')}</span>
        </Button>
      </div>
    ),
    [openEventForm, t]
  )

  if (headerComponent) {
    // Render custom header component if provided
    return headerComponent
  }

  return (
    <>
      {/* Calendar Header with grid layout */}
      <div
        className="@container/base-header w-full"
        data-testid="calendar-header"
      >
        <div
          className={cn(
            'flex justify-center @2xl/base-header:justify-between flex-wrap items-center gap-2 border-b',
            className,
            headerClassName
          )}
        >
          {/* Title area - Left section */}
          <div className="flex flex-wrap items-center justify-center gap-1 @2xl/base-header:justify-start">
            <CalendarIcon className="h-5 w-5" />
            <TitleContent />
          </div>

          {/* New event button - Mobile & Desktop */}
          <div className="flex flex-wrap justify-start @xl/base-header:justify-center gap-1 @4xl/base-header:justify-end overflow-x-auto">
            {/* Desktop controls - centralized */}
            <div className="hidden @md/base-header:flex items-center justify-start gap-1">
              <ViewControls
                currentView={view}
                onChange={setView}
                onToday={today}
                onNext={nextPeriod}
                onPrevious={prevPeriod}
                variant="default"
                className="justify-end"
              />

              {/* New event button - Desktop */}
              <NewEventButton />

              {/* Export button - Desktop */}
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                <span className="hidden @4xl/base-header:inline">
                  {t('export')}
                </span>
              </Button>
            </div>

            {/* Mobile navigation menu button - Right aligned */}
            <div className="flex items-center justify-end gap-1 @md/base-header:hidden">
              {/* New event button - Mobile */}
              <NewEventButton />

              <Popover
                open={mobilePopoverOpen}
                onOpenChange={setMobilePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[240px] p-2">
                  <div className="space-y-2">
                    <h3 className="mb-1 text-sm font-medium">
                      View & Navigation
                    </h3>
                    <ViewControls
                      currentView={view}
                      onChange={(newView) => handleViewChange(newView, true)}
                      onToday={handleNavigation.today}
                      onNext={handleNavigation.next}
                      onPrevious={handleNavigation.previous}
                      variant="grid"
                    />

                    {/* Export button - Mobile */}
                    <div className="pt-2 border-t">
                      <Button
                        onClick={handleExport}
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {t('export')} Calendar (.ics)
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Header
