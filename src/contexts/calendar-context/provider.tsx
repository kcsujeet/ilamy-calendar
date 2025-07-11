import dayjs from "dayjs";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CalendarContext } from "./context";
import { CalendarEvent } from "@/index";

interface CalendarProviderProps {
  children: ReactNode;
  initialEvents?: CalendarEvent[];
  firstDayOfWeek?: number; // 0 for Sunday, 1 for Monday, etc.
  renderEvent?: (event: CalendarEvent) => ReactNode;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: dayjs.Dayjs) => void;
  onViewChange?: (view: "month" | "week" | "day" | "year") => void;
  locale?: string;
  timezone?: string;
  disableDateClick?: boolean;
  disableEventClick?: boolean;
  disableDragAndDrop?: boolean;
  dayMaxEvents: number;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  initialEvents = [],
  firstDayOfWeek = 0, // Default to Sunday,
  renderEvent,
  onEventClick,
  onDateClick,
  onViewChange,
  locale,
  timezone,
  disableDateClick,
  disableEventClick,
  disableDragAndDrop,
  dayMaxEvents,
}) => {
  // State
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [view, setView] = useState<"month" | "week" | "day" | "year">("month");
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isEventFormOpen, setIsEventFormOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [currentLocale, setCurrentLocale] = useState<string>(locale || "en");

  // Update events when initialEvents prop changes
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Configure locale when locale prop changes
  useEffect(() => {
    if (locale) {
      setCurrentLocale(locale);
      dayjs.locale(locale);
    }
  }, [locale]);

  // Configure timezone for currentDate when timezone prop changes
  useEffect(() => {
    if (timezone) {
      setCurrentDate((prevDate) => prevDate.tz(timezone));
    }
  }, [timezone]);

  // Handlers
  const selectDate = useCallback((date: dayjs.Dayjs) => {
    setCurrentDate(date);
  }, []);

  const nextPeriod = useCallback(() => {
    switch (view) {
      case "month":
        setCurrentDate((currentDate) => currentDate.add(1, "month"));
        break;
      case "week":
        setCurrentDate((currentDate) => currentDate.add(1, "week"));
        break;
      case "day":
        setCurrentDate((currentDate) => currentDate.add(1, "day"));
        break;
      case "year":
        setCurrentDate((currentDate) => currentDate.add(1, "year"));
        break;
    }
  }, [view]);

  const prevPeriod = useCallback(() => {
    switch (view) {
      case "month":
        setCurrentDate((currentDate) => currentDate.subtract(1, "month"));
        break;
      case "week":
        setCurrentDate((currentDate) => currentDate.subtract(1, "week"));
        break;
      case "day":
        setCurrentDate((currentDate) => currentDate.subtract(1, "day"));
        break;
      case "year":
        setCurrentDate((currentDate) => currentDate.subtract(1, "year"));
        break;
    }
  }, [view]);

  const today = useCallback(() => {
    setCurrentDate(dayjs());
  }, []);

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents((prevEvents) => [...prevEvents, event]);
  }, []);

  const updateEvent = useCallback(
    (eventId: string, updatedEvent: Partial<CalendarEvent>) => {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId ? { ...event, ...updatedEvent } : event
        )
      );
    },
    []
  );

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );
  }, []);

  const editEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventFormOpen(true);
  }, []);

  const closeEventForm = useCallback(() => {
    setSelectedDate(null);
    setSelectedEvent(null);
    setIsEventFormOpen(false);
  }, []);

  // Custom handlers that call external callbacks
  const handleViewChange = useCallback(
    (newView: "month" | "week" | "day" | "year") => {
      setView(newView);
      onViewChange?.(newView);
    },
    [onViewChange]
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (disableDateClick) return;
      if (onEventClick) {
        onEventClick(event);
      } else {
        editEvent(event);
      }
    },
    [disableDateClick, onEventClick, editEvent]
  );

  const handleDateClick = useCallback(
    (date: dayjs.Dayjs) => {
      if (disableDateClick) return;

      if (onDateClick) {
        onDateClick(date);
      } else {
        setSelectedDate(date);
        setIsEventFormOpen(true);
      }
    },
    [onDateClick, disableDateClick]
  );

  // Helper function to get the next occurrence based on frequency
  const getNextOccurrence = useCallback(
    (
      date: dayjs.Dayjs,
      freq: "daily" | "weekly" | "monthly" | "yearly",
      int: number,
      days?: number[]
    ): dayjs.Dayjs => {
      switch (freq) {
        case "daily":
          return date.add(int, "day");
        case "weekly":
          if (days && days.length > 0) {
            // If we have specific days of the week, find the next day in the list
            let nextDate = date.add(1, "day");
            let loopCount = 0;

            // Prevent infinite loop - maximum 7 iterations to find the next day
            while (loopCount < 7) {
              if (days.includes(nextDate.day())) {
                return nextDate;
              }
              nextDate = nextDate.add(1, "day");
              loopCount++;
            }

            // If we couldn't find the next day, just add the interval weeks
            return date.add(int, "week");
          } else {
            // Otherwise, just add the interval weeks
            return date.add(int, "week");
          }
        case "monthly":
          return date.add(int, "month");
        case "yearly":
          return date.add(int, "year");
      }
    },
    []
  );

  // Expand recurring events for a date range
  const expandRecurringEvent = useCallback(
    (
      baseEvent: CalendarEvent,
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs
    ): CalendarEvent[] => {
      const expandedEvents: CalendarEvent[] = [];
      if (!baseEvent.recurrence) return [baseEvent];

      const {
        frequency,
        interval,
        endDate: recurrenceEndDate,
        count,
        daysOfWeek,
        exceptions = [],
      } = baseEvent.recurrence;

      // Get existing exceptions from the events array
      const existingExceptions = events.filter(
        (event) => event.parentEventId === baseEvent.id && event.isException
      );

      // Calculate the duration of the event
      const duration = baseEvent.end.diff(baseEvent.start, "minute");

      // Determine the maximum end date for recurrence
      const maxEndDate =
        recurrenceEndDate && recurrenceEndDate.isBefore(endDate)
          ? recurrenceEndDate
          : endDate;

      let currentDate = baseEvent.start.clone();
      let occurrences = 0;

      // If the recurring event starts after the end of our range, no events to generate
      if (currentDate.isAfter(maxEndDate)) {
        return [];
      }

      // If we need to start in the middle of a recurrence pattern,
      // fast-forward to find the first occurrence in our date range
      if (currentDate.isBefore(startDate)) {
        switch (frequency) {
          case "daily": {
            const daysToAdd =
              Math.floor(startDate.diff(currentDate, "day") / interval) *
              interval;
            if (daysToAdd > 0) {
              currentDate = currentDate.add(daysToAdd, "day");
            }
            break;
          }
          case "weekly": {
            if (!daysOfWeek || daysOfWeek.length === 0) {
              const weeksToAdd =
                Math.floor(startDate.diff(currentDate, "week") / interval) *
                interval;
              if (weeksToAdd > 0) {
                currentDate = currentDate.add(weeksToAdd, "week");
              }
            }
            break;
          }
          case "monthly": {
            const monthsToAdd =
              Math.floor(startDate.diff(currentDate, "month") / interval) *
              interval;
            if (monthsToAdd > 0) {
              currentDate = currentDate.add(monthsToAdd, "month");
            }
            break;
          }
          case "yearly": {
            const yearsToAdd =
              Math.floor(startDate.diff(currentDate, "year") / interval) *
              interval;
            if (yearsToAdd > 0) {
              currentDate = currentDate.add(yearsToAdd, "year");
            }
            break;
          }
        }
      }

      while (
        (currentDate.isBefore(maxEndDate) ||
          currentDate.isSame(maxEndDate, "day")) &&
        (count === undefined || occurrences < count)
      ) {
        // Format current date for comparison
        const currentDateStr = currentDate.format("YYYY-MM-DD");

        // Skip if this date is in exceptions
        if (
          exceptions.some(
            (date) => date.format("YYYY-MM-DD") === currentDateStr
          )
        ) {
          // Move to the next occurrence
          currentDate = getNextOccurrence(
            currentDate,
            frequency,
            interval,
            daysOfWeek
          );
          continue;
        }

        // Skip if it's a weekly recurrence with specified days and current day is not included
        if (
          frequency === "weekly" &&
          daysOfWeek &&
          daysOfWeek.length > 0 &&
          !daysOfWeek.includes(currentDate.day())
        ) {
          currentDate = currentDate.add(1, "day");
          continue;
        }

        // Check if we have a custom exception for this occurrence
        const exceptionEvent = existingExceptions.find(
          (event) => event.start.format("YYYY-MM-DD") === currentDateStr
        );

        if (exceptionEvent) {
          // Use the exception instead of generating a new event
          expandedEvents.push(exceptionEvent);
        } else if (currentDate.isAfter(startDate.subtract(1, "day"))) {
          // Create a new occurrence if it falls within the requested range
          const eventInstance: CalendarEvent = {
            ...baseEvent,
            id: `${baseEvent.id}-${currentDate.format("YYYYMMDD")}`,
            start: currentDate.clone(),
            end: currentDate.clone().add(duration, "minute"),
            isRecurring: true,
            parentEventId: baseEvent.id,
          };
          expandedEvents.push(eventInstance);
        }

        occurrences++;
        currentDate = getNextOccurrence(
          currentDate,
          frequency,
          interval,
          daysOfWeek
        );
      }

      return expandedEvents;
    },
    [events, getNextOccurrence]
  );

  // Event query functions
  const getEventsForDateRange = useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs): CalendarEvent[] => {
      const startDate = start.startOf("day");
      const endDate = end.endOf("day");

      // Filter regular events first
      const regularEvents = events.filter((event) => {
        // Fixed logic for checking if event overlaps with the date range
        return (
          // Case 1: Event starts within the range
          ((event.start.isAfter(startDate) || event.start.isSame(startDate)) &&
            (event.start.isBefore(endDate) || event.start.isSame(endDate))) ||
          // Case 2: Event ends within the range
          ((event.end.isAfter(startDate) || event.end.isSame(startDate)) &&
            (event.end.isBefore(endDate) || event.end.isSame(endDate))) ||
          // Case 3: Event spans across the entire range
          (event.start.isBefore(startDate) && event.end.isAfter(endDate))
        );
      });

      // Find parent recurring events that need to be expanded
      const recurringParentEvents = events.filter(
        (event) => event.recurrence && !event.parentEventId
      );

      // Expand recurring events for this range
      let recurringEvents: CalendarEvent[] = [];
      recurringParentEvents.forEach((parentEvent) => {
        const expanded = expandRecurringEvent(parentEvent, startDate, endDate);
        recurringEvents = [...recurringEvents, ...expanded];
      });

      // Combine all events and remove any duplicates
      return [...regularEvents, ...recurringEvents].filter(
        (event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
      );
    },
    [events, expandRecurringEvent]
  );

  const getEventsForDate = useCallback(
    (date: dayjs.Dayjs): CalendarEvent[] => {
      const day = date.startOf("day");
      const nextDay = day.add(1, "day");
      return getEventsForDateRange(day, nextDay);
    },
    [getEventsForDateRange]
  );

  const getEventsForWeek = useCallback(
    (startOfWeek: dayjs.Dayjs): CalendarEvent[] => {
      const endOfWeek = startOfWeek.add(6, "day").endOf("day");
      return getEventsForDateRange(startOfWeek, endOfWeek);
    },
    [getEventsForDateRange]
  );

  // Recurring event operations
  const addRecurringEvent = useCallback((event: CalendarEvent) => {
    setEvents((prevEvents) => [...prevEvents, event]);
  }, []);

  const deleteRecurringEvent = useCallback(
    (eventId: string, deleteAll: boolean) => {
      setEvents((prevEvents) => {
        // Find the event by ID
        const event = prevEvents.find((e) => e.id === eventId);
        if (!event) return prevEvents;

        if (event.parentEventId && !deleteAll) {
          // This is a recurring instance, and we only want to delete this instance

          // Find the parent event
          const parentEvent = prevEvents.find(
            (e) => e.id === event.parentEventId
          );
          if (!parentEvent || !parentEvent.recurrence) return prevEvents;

          // Add this date to the exceptions list
          return prevEvents.map((e) => {
            if (e.id === event.parentEventId) {
              return {
                ...e,
                recurrence: {
                  ...e.recurrence!,
                  exceptions: [
                    ...(e.recurrence!.exceptions || []),
                    event.start.startOf("day"),
                  ],
                },
              };
            }
            return e;
          });
        } else if (event.parentEventId && deleteAll) {
          // We want to delete all occurrences of this recurring event
          // Find the parent ID and delete it and all its children
          return prevEvents.filter(
            (e) =>
              e.id !== event.parentEventId &&
              e.parentEventId !== event.parentEventId
          );
        } else if (event.recurrence) {
          // This is a parent recurring event, delete it and all its instances
          return prevEvents.filter(
            (e) => e.id !== event.id && e.parentEventId !== event.id
          );
        } else {
          // Regular event, just delete it
          return prevEvents.filter((e) => e.id !== event.id);
        }
      });
    },
    []
  );

  const updateRecurringEvent = useCallback(
    (
      eventId: string,
      updatedEvent: Partial<CalendarEvent>,
      updateAll: boolean
    ) => {
      setEvents((prevEvents) => {
        // Find the event by ID
        const event = prevEvents.find((e) => e.id === eventId);
        if (!event) return prevEvents;

        if (event.parentEventId && !updateAll) {
          // This is a recurring instance being updated individually

          // Create an exception with the updates
          const exceptionEvent: CalendarEvent = {
            ...event,
            ...updatedEvent,
            isException: true,
          };

          // Add the exception to the store and add this date to the parent's exceptions list
          const updatedEvents = prevEvents.map((e) => {
            if (e.id === event.parentEventId) {
              return {
                ...e,
                recurrence: {
                  ...e.recurrence!,
                  exceptions: [
                    ...(e.recurrence!.exceptions || []),
                    event.start.startOf("day"),
                  ],
                },
              };
            }
            return e;
          });

          return [...updatedEvents, exceptionEvent];
        } else if (event.parentEventId && updateAll) {
          // Update all occurrences by updating the parent
          // Find the parent and update it
          return prevEvents.map((e) => {
            if (e.id === event.parentEventId) {
              return { ...e, ...updatedEvent };
            }
            return e;
          });
        } else if (event.recurrence) {
          // This is a parent recurring event, update it directly
          return prevEvents.map((e) => {
            if (e.id === event.id) {
              return { ...e, ...updatedEvent };
            }
            return e;
          });
        } else {
          // Regular event, just update it
          return prevEvents.map((e) => {
            if (e.id === event.id) {
              return { ...e, ...updatedEvent };
            }
            return e;
          });
        }
      });
    },
    []
  );

  const createExceptionForRecurringEvent = useCallback(
    (eventId: string, date: dayjs.Dayjs) => {
      setEvents((prevEvents) => {
        // Find the event first
        const event = prevEvents.find((e) => e.id === eventId);
        if (!event || !event.recurrence) return prevEvents;

        // Add the date to exceptions
        return prevEvents.map((e) => {
          if (e.id === eventId) {
            return {
              ...e,
              recurrence: {
                ...e.recurrence!,
                exceptions: [
                  ...(e.recurrence!.exceptions || []),
                  date.startOf("day"),
                ],
              },
            };
          }
          return e;
        });
      });
    },
    []
  );

  // Create the context value
  const contextValue = useMemo(
    () => ({
      currentDate,
      view,
      events,
      currentLocale,
      isEventFormOpen,
      selectedEvent,
      selectedDate,
      firstDayOfWeek,
      setCurrentDate,
      selectDate,
      setView: handleViewChange,
      nextPeriod,
      prevPeriod,
      today,
      addEvent,
      updateEvent,
      deleteEvent,
      openEventForm: () => setIsEventFormOpen(true),
      closeEventForm,
      getEventsForDate,
      getEventsForWeek,
      getEventsForDateRange,
      expandRecurringEvent,
      addRecurringEvent,
      deleteRecurringEvent,
      updateRecurringEvent,
      createExceptionForRecurringEvent,
      renderEvent,
      onEventClick: handleEventClick,
      onDateClick: handleDateClick,
      locale,
      timezone,
      disableDateClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
    }),
    [
      currentDate,
      view,
      events,
      currentLocale,
      isEventFormOpen,
      selectedEvent,
      selectedDate,
      firstDayOfWeek,
      selectDate,
      handleViewChange,
      nextPeriod,
      prevPeriod,
      today,
      addEvent,
      updateEvent,
      deleteEvent,
      closeEventForm,
      getEventsForDate,
      getEventsForWeek,
      getEventsForDateRange,
      expandRecurringEvent,
      addRecurringEvent,
      deleteRecurringEvent,
      updateRecurringEvent,
      createExceptionForRecurringEvent,
      renderEvent,
      handleEventClick,
      handleDateClick,
      locale,
      timezone,
      disableDateClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
    ]
  );

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};
