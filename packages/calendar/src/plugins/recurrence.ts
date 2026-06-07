// Public subpath entry: `@ilamy/calendar/plugins/recurrence`.
//
// The recurrence plugin is developed as a separate workspace package
// (@ilamy/calendar-recurrence) for isolation/testing, but it is NOT published on
// its own — it is bundled into @ilamy/calendar and re-exported here. Re-exporting
// (rather than a side-effect import) keeps the plugin's `declare module
// '@ilamy/calendar'` CalendarEvent augmentation in the emitted .d.ts.
export * from '@ilamy/calendar-recurrence'
