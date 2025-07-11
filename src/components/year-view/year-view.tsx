import React from "react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import { useCalendarContext } from "@/contexts/calendar-context/context";
import { AnimatePresence, motion } from "motion/react";

const YearView: React.FC = () => {
  const { currentDate, selectDate, events, setView, getEventsForDate } =
    useCalendarContext();
  const year = currentDate.year();

  // Generate an array of 12 months for the current year
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = dayjs().year(year).month(i).startOf("month");
    return {
      date: monthDate,
      name: monthDate.format("MMMM"),
      daysInMonth: monthDate.daysInMonth(),
      firstDayOfMonth: monthDate.startOf("month").day(), // 0-6, 0 is Sunday
    };
  });

  // Calculate events for each month
  const monthsWithEventCount = months.map((month) => {
    const eventsInMonth = events.filter(
      (event) =>
        event.start.year() === year &&
        event.start.month() === month.date.month()
    );

    return {
      ...month,
      eventCount: eventsInMonth.length,
    };
  });

  // Handle month click to navigate to month view
  const handleMonthClick = (date: dayjs.Dayjs) => {
    selectDate(date);
    setView("month");
  };

  // Handle day click within the mini calendar
  const handleDayClick = (date: dayjs.Dayjs, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the month click
    selectDate(date);
    setView("day"); // Navigate directly to day view when clicking on a specific day
  };

  // Generate days for mini calendar in each month
  const renderMiniCalendar = (month: (typeof monthsWithEventCount)[0]) => {
    // Get the first day of the month's calendar (which could be in the previous month)
    const firstDayOfCalendar = month.date.startOf("month").startOf("week");

    // Create 42 days (6 rows of 7 days) for consistency
    const daysArray = Array.from({ length: 42 }, (_, i) => {
      const day = firstDayOfCalendar.add(i, "day");
      const isCurrentMonth = day.month() === month.date.month();
      const isToday = day.isSame(dayjs(), "day");
      const isCurrentDate = day.isSame(currentDate, "day");

      // Get events for this day
      const dayEvents = getEventsForDate(day);
      const hasEvents = dayEvents.length > 0;

      return {
        day,
        isCurrentMonth,
        isToday,
        isCurrentDate,
        hasEvents,
        eventCount: dayEvents.length,
        // Group events by their categories to show different colors
        events: dayEvents,
      };
    });

    return (
      <div className="grid grid-cols-7 gap-[1px] text-[0.6rem]">
        {/* Day names */}
        {["S", "M", "T", "W", "T", "F", "S"].map((dayName, i) => (
          <div
            key={`header-${i}`}
            className="text-muted-foreground h-3 text-center"
          >
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {daysArray.map((dayInfo, i) => (
          <div
            key={`day-${i}`}
            onClick={(e) => handleDayClick(dayInfo.day, e)}
            className={cn(
              "relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center",
              "hover:bg-accent/70 rounded-sm transition-colors duration-200",
              !dayInfo.isCurrentMonth && "text-muted-foreground opacity-50",
              dayInfo.isToday &&
                "bg-primary text-primary-foreground rounded-full",
              dayInfo.isCurrentDate &&
                !dayInfo.isToday &&
                "bg-muted rounded-full font-bold",
              dayInfo.hasEvents &&
                !dayInfo.isToday &&
                !dayInfo.isCurrentDate &&
                "font-medium"
            )}
            title={
              dayInfo.hasEvents
                ? `${dayInfo.eventCount} event${
                    dayInfo.eventCount > 1 ? "s" : ""
                  }`
                : ""
            }
          >
            <span className="text-center leading-none">
              {dayInfo.day.date()}
            </span>

            {/* Enhanced event indicator - show multiple colored dots for different event types */}
            {dayInfo.hasEvents && (
              <div
                className={cn(
                  "absolute bottom-0 flex w-full justify-center space-x-[1px]",
                  dayInfo.isToday ? "bottom-[1px]" : ""
                )}
              >
                {/* Show up to 3 event dots with different colors if available */}
                {dayInfo.eventCount > 0 && (
                  <span
                    className={cn(
                      "h-[3px] w-[3px] rounded-full",
                      dayInfo.isToday ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                )}
                {dayInfo.eventCount > 1 && (
                  <span
                    className={cn(
                      "h-[3px] w-[3px] rounded-full",
                      dayInfo.isToday ? "bg-primary-foreground" : "bg-blue-500"
                    )}
                  />
                )}
                {dayInfo.eventCount > 2 && (
                  <span
                    className={cn(
                      "h-[3px] w-[3px] rounded-full",
                      dayInfo.isToday ? "bg-primary-foreground" : "bg-green-500"
                    )}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {monthsWithEventCount.map((month, index) => (
          <div
            key={month.name}
            onClick={() => handleMonthClick(month.date)}
            className="bg-card hover:border-primary flex cursor-pointer flex-col rounded-lg border p-3 transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`month-${index}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.25,
                  ease: "easeInOut",
                  delay: index * 0.05,
                }}
                className="mb-2 flex items-center justify-between"
              >
                <h3 className="text-lg font-medium">{month.name}</h3>
                {month.eventCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
                    {month.eventCount}{" "}
                    {month.eventCount === 1 ? "event" : "events"}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>

            {renderMiniCalendar(month)}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default YearView;
