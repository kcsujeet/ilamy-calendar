import type { Translations } from './types'

export const defaultTranslations: Translations = {
	// Common actions
	today: 'Today',
	create: 'Create',
	new: 'New',
	update: 'Update',
	delete: 'Delete',
	cancel: 'Cancel',
	export: 'Export',

	// Event related
	event: 'Event',
	events: 'Events',
	newEvent: 'New Event',
	title: 'Title',
	description: 'Description',
	location: 'Location',
	allDay: 'All day',
	startDate: 'Start Date',
	endDate: 'End Date',
	startTime: 'Start Time',
	searchTime: 'Search time...',
	endTime: 'End Time',
	color: 'Color',

	// Event form
	createEvent: 'Create Event',
	editEvent: 'Edit Event',
	addNewEvent: 'Add a new event to your calendar',
	editEventDetails: 'Edit your event details',
	eventTitlePlaceholder: 'Event title',
	eventDescriptionPlaceholder: 'Event description (optional)',
	eventLocationPlaceholder: 'Event location (optional)',

	// Recurrence
	repeat: 'Repeat',
	repeats: 'Repeats',
	customRecurrence: 'Custom recurrence',
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
	yearly: 'Yearly',
	interval: 'Interval',
	repeatOn: 'Repeat on',
	never: 'Never',
	count: 'Count',
	every: 'Every',
	ends: 'Ends',
	after: 'After',
	occurrences: 'occurrences',
	on: 'On',

	// Recurrence edit dialog
	editRecurringEvent: 'Edit recurring event',
	deleteRecurringEvent: 'Delete recurring event',
	editRecurringEventQuestion:
		'is a recurring event. How would you like to edit it?',
	deleteRecurringEventQuestion:
		'is a recurring event. How would you like to delete it?',
	thisEvent: 'This event',
	thisEventDescription: 'Only change this specific occurrence',
	thisAndFollowingEvents: 'This and following events',
	thisAndFollowingEventsDescription: 'Edit this and all future occurrences',
	allEvents: 'All events',
	allEventsDescription: 'Edit the entire recurring series',
	onlyChangeThis: 'Only change this specific occurrence',
	changeThisAndFuture: 'Change this and all future occurrences',
	changeEntireSeries: 'Change the entire recurring series',
	onlyDeleteThis: 'Only delete this specific occurrence',
	deleteThisAndFuture: 'Delete this and all future occurrences',
	deleteEntireSeries: 'Delete the entire recurring series',

	// View types
	month: 'Month',
	week: 'Week',
	day: 'Day',
	year: 'Year',
	more: 'more',

	// Resource calendar
	resources: 'Resources',
	resource: 'Resource',
	time: 'Time',
	date: 'Date',
	noResourcesVisible: 'No resources visible',
	addResourcesOrShowExisting: 'Add resources or show existing ones',

	// Days of week
	sunday: 'Sunday',
	monday: 'Monday',
	tuesday: 'Tuesday',
	wednesday: 'Wednesday',
	thursday: 'Thursday',
	friday: 'Friday',
	saturday: 'Saturday',

	// Days short
	sun: 'Sun',
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',

	// Months
	january: 'January',
	february: 'February',
	march: 'March',
	april: 'April',
	may: 'May',
	june: 'June',
	july: 'July',
	august: 'August',
	september: 'September',
	october: 'October',
	november: 'November',
	december: 'December',
}
