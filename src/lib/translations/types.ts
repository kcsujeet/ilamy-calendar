export interface Translations {
  // Common actions
  today: string
  create: string
  new: string
  update: string
  delete: string
  cancel: string
  export: string

  // Event related
  event: string
  events: string
  newEvent: string
  title: string
  description: string
  location: string
  allDay: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  color: string

  // Event form
  createEvent: string
  editEvent: string
  addNewEvent: string
  editEventDetails: string
  eventTitlePlaceholder: string
  eventDescriptionPlaceholder: string
  eventLocationPlaceholder: string

  // Recurrence
  repeat: string
  repeats: string
  customRecurrence: string
  daily: string
  weekly: string
  monthly: string
  yearly: string
  interval: string
  repeatOn: string
  never: string
  count: string
  every: string
  ends: string
  after: string
  occurrences: string
  on: string

  // Recurrence edit dialog
  editRecurringEvent: string
  deleteRecurringEvent: string
  editRecurringEventQuestion: string
  deleteRecurringEventQuestion: string
  thisEvent: string
  thisEventDescription: string
  thisAndFollowingEvents: string
  thisAndFollowingEventsDescription: string
  allEvents: string
  allEventsDescription: string
  onlyChangeThis: string
  changeThisAndFuture: string
  changeEntireSeries: string
  onlyDeleteThis: string
  deleteThisAndFuture: string
  deleteEntireSeries: string

  // View types
  month: string
  week: string
  day: string
  year: string
  more: string

  // Days of week
  sunday: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string

  // Days short
  sun: string
  mon: string
  tue: string
  wed: string
  thu: string
  fri: string
  sat: string

  // Months
  january: string
  february: string
  march: string
  april: string
  may: string
  june: string
  july: string
  august: string
  september: string
  october: string
  november: string
  december: string
}

export type TranslationKey = keyof Translations
export type TranslatorFunction = (key: TranslationKey | string) => string
