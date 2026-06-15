import type { Translations } from '@ilamy/calendar'

export const en: Partial<Translations> = {
	// Common actions
	today: 'Today',
	create: 'Create',
	update: 'Update',
	delete: 'Delete',
	cancel: 'Cancel',
	new: 'New',
	export: 'Export',

	// Event related
	event: 'Event',
	events: 'Events',
	newEvent: 'New Event',
	title: 'Title',
	description: 'Description',
	location: 'Location',
	allDay: 'All Day',
	startDate: 'Start Date',
	endDate: 'End Date',
	startTime: 'Start Time',
	endTime: 'End Time',
	color: 'Color',

	// Event form
	createEvent: 'Create Event',
	editEvent: 'Edit Event',
	addNewEvent: 'Add New Event',
	editEventDetails: 'Edit Event Details',
	eventTitlePlaceholder: 'Enter event title...',
	eventDescriptionPlaceholder: 'Enter event description...',
	eventLocationPlaceholder: 'Enter event location...',

	// Recurrence
	repeat: 'Repeat',
	repeats: 'Repeats',
	customRecurrence: 'Custom Recurrence',
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
	yearly: 'Yearly',
	interval: 'Interval',
	repeatOn: 'Repeat On',
	never: 'Never',
	count: 'Count',
	every: 'Every',
	ends: 'Ends',
	after: 'After',
	occurrences: 'Occurrences',
	on: 'On',

	// Recurrence edit dialog
	editRecurringEvent: 'Edit Recurring Event',
	deleteRecurringEvent: 'Delete Recurring Event',
	editRecurringEventQuestion:
		'How would you like to edit this recurring event?',
	deleteRecurringEventQuestion:
		'How would you like to delete this recurring event?',
	thisEvent: 'This Event',
	thisEventDescription: 'Only this occurrence',
	thisAndFollowingEvents: 'This and Following Events',
	thisAndFollowingEventsDescription: 'This and all future occurrences',
	allEvents: 'All Events',
	allEventsDescription: 'All occurrences in the series',
	onlyChangeThis: 'Only Change This',
	changeThisAndFuture: 'Change This and Future',
	changeEntireSeries: 'Change Entire Series',
	onlyDeleteThis: 'Only Delete This',
	deleteThisAndFuture: 'Delete This and Future',
	deleteEntireSeries: 'Delete Entire Series',

	// View types
	month: 'Month',
	week: 'Week',
	day: 'Day',
	year: 'Year',
	more: 'More',

	// Resource calendar
	resources: 'Resources',
	resource: 'Resource',
	time: 'Time',
	date: 'Date',
	noResourcesVisible: 'No resources visible',
	addResourcesOrShowExisting: 'Add resources or show existing ones',
}
