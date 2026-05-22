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
	searchTime: string
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
	repeatsEvery: string
	recurrenceOnce: string
	recurrenceEveryDay: string
	recurrenceEveryWeekday: string
	recurrenceEveryWeekOn: string
	recurrenceEveryMonthOnDay: string
	recurrenceEveryMonthOnThe: string
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
	onDay: string
	onThe: string
	recurrenceOn: string
	first: string
	second: string
	third: string
	fourth: string
	last: string
	of: string
	recurrenceDay: string
	recurrenceWeekday: string
	recurrenceWeekend: string
	position: string
	dayOfMonth: string

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

	// Resource calendar
	resources: string
	resource: string
	time: string
	date: string
	noResourcesVisible: string
	addResourcesOrShowExisting: string
}

export type TranslationKey = keyof Translations
export type TranslatorFunction = (key: TranslationKey | string) => string
