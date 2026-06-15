import type { Translations } from '@ilamy/calendar'

export const de: Partial<Translations> = {
	// Common actions
	today: 'Heute',
	create: 'Erstellen',
	update: 'Aktualisieren',
	delete: 'Löschen',
	cancel: 'Abbrechen',
	new: 'Neu',
	export: 'Exportieren',

	// Event related
	event: 'Ereignis',
	events: 'Ereignisse',
	newEvent: 'Neues Ereignis',
	title: 'Titel',
	description: 'Beschreibung',
	location: 'Ort',
	allDay: 'Ganztägig',
	startDate: 'Startdatum',
	endDate: 'Enddatum',
	startTime: 'Startzeit',
	endTime: 'Endzeit',
	color: 'Farbe',

	// Event form
	createEvent: 'Ereignis erstellen',
	editEvent: 'Ereignis bearbeiten',
	addNewEvent: 'Neues Ereignis hinzufügen',
	editEventDetails: 'Ereignisdetails bearbeiten',
	eventTitlePlaceholder: 'Ereignistitel eingeben...',
	eventDescriptionPlaceholder: 'Ereignisbeschreibung eingeben...',
	eventLocationPlaceholder: 'Ereignisort eingeben...',

	// Recurrence
	repeat: 'Wiederholen',
	repeats: 'Wiederholt',
	customRecurrence: 'Benutzerdefinierte Wiederholung',
	daily: 'Täglich',
	weekly: 'Wöchentlich',
	monthly: 'Monatlich',
	yearly: 'Jährlich',
	interval: 'Intervall',
	repeatOn: 'Wiederholen am',
	never: 'Niemals',
	count: 'Anzahl',
	every: 'Alle',
	ends: 'Endet',
	after: 'Nach',
	occurrences: 'Vorkommen',
	on: 'Am',

	// Recurrence edit dialog
	editRecurringEvent: 'Wiederkehrendes Ereignis bearbeiten',
	deleteRecurringEvent: 'Wiederkehrendes Ereignis löschen',
	editRecurringEventQuestion:
		'Wie möchten Sie dieses wiederkehrende Ereignis bearbeiten?',
	deleteRecurringEventQuestion:
		'Wie möchten Sie dieses wiederkehrende Ereignis löschen?',
	thisEvent: 'Dieses Ereignis',
	thisEventDescription: 'Nur dieses Vorkommen',
	thisAndFollowingEvents: 'Dieses und folgende Ereignisse',
	thisAndFollowingEventsDescription: 'Dieses und alle zukünftigen Vorkommen',
	allEvents: 'Alle Ereignisse',
	allEventsDescription: 'Alle Vorkommen in der Serie',
	onlyChangeThis: 'Nur dieses ändern',
	changeThisAndFuture: 'Dieses und zukünftige ändern',
	changeEntireSeries: 'Gesamte Serie ändern',
	onlyDeleteThis: 'Nur dieses löschen',
	deleteThisAndFuture: 'Dieses und zukünftige löschen',
	deleteEntireSeries: 'Gesamte Serie löschen',

	// View types
	month: 'Monat',
	week: 'Woche',
	day: 'Tag',
	year: 'Jahr',
	more: 'Mehr',

	// Resource calendar
	resources: 'Ressourcen',
	resource: 'Ressource',
	time: 'Zeit',
	date: 'Datum',
	noResourcesVisible: 'Keine Ressourcen sichtbar',
	addResourcesOrShowExisting: 'Ressourcen hinzufügen oder vorhandene anzeigen',
}
