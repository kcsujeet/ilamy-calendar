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

	// Resource calendar
	resources: string
	resource: string
	time: string
	date: string
	noResourcesVisible: string
	addResourcesOrShowExisting: string

	// Date picker
	pickADate: string
	previousMonth: string
	nextMonth: string
}

export type TranslationKey = keyof Translations
export type TranslatorFunction = (key: TranslationKey | string) => string
