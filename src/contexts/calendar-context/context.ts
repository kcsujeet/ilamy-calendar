import { CalendarEvent } from "@/index";
import dayjs from "dayjs";
import { createContext, useContext } from "react";

export interface CalendarContextType {
  currentDate: dayjs.Dayjs;
  view: "month" | "week" | "day" | "year";
  events: CalendarEvent[];
  isEventFormOpen: boolean;
  selectedEvent: CalendarEvent | null;
  selectedDate: dayjs.Dayjs | null;
  firstDayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  setCurrentDate: (date: dayjs.Dayjs) => void;
  selectDate: (date: dayjs.Dayjs) => void;
  setView: (view: "month" | "week" | "day" | "year") => void;
  nextPeriod: () => void;
  prevPeriod: () => void;
  today: () => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  openEventForm: (date?: dayjs.Dayjs, event?: CalendarEvent) => void;
  closeEventForm: () => void;
  getEventsForDate: (date: dayjs.Dayjs) => CalendarEvent[];
  getEventsForWeek: (startOfWeek: dayjs.Dayjs) => CalendarEvent[];
  getEventsForDateRange: (
    start: dayjs.Dayjs,
    end: dayjs.Dayjs
  ) => CalendarEvent[];
  expandRecurringEvent: (
    baseEvent: CalendarEvent,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => CalendarEvent[];
  addRecurringEvent: (event: CalendarEvent) => void;
  deleteRecurringEvent: (eventId: string, deleteAll: boolean) => void;
  updateRecurringEvent: (
    eventId: string,
    updatedEvent: Partial<CalendarEvent>,
    updateAll: boolean
  ) => void;
  createExceptionForRecurringEvent: (
    eventId: string,
    date: dayjs.Dayjs
  ) => void;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: dayjs.Dayjs) => void;
  currentLocale?: string;
  disableDateClick?: boolean;
  disableEventClick?: boolean;
  disableDragAndDrop?: boolean;
  dayMaxEvents: number;
}

export const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider"
    );
  }
  return context;
};

export const usePublicCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendarContext must be used within ilamy calendar");
  }
  return {
    currentDate: context.currentDate,
    view: context.view,
    events: context.events,
    isEventFormOpen: context.isEventFormOpen,
    selectedEvent: context.selectedEvent,
    selectedDate: context.selectedDate,
    firstDayOfWeek: context.firstDayOfWeek,
    setCurrentDate: context.setCurrentDate,
    selectDate: context.selectDate,
    setView: context.setView,
    nextPeriod: context.nextPeriod,
    prevPeriod: context.prevPeriod,
    today: context.today,
    addEvent: context.addEvent,
    updateEvent: context.updateEvent,
    deleteEvent: context.deleteEvent,
    openEventForm: context.openEventForm,
    closeEventForm: context.closeEventForm,
  };
};
