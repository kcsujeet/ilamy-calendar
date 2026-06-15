import type { Translations } from '@ilamy/calendar'

export const cs: Partial<Translations> = {
	// Common actions
	today: 'Dnes',
	create: 'Vytvořit',
	update: 'Aktualizovat',
	delete: 'Smazat',
	cancel: 'Zrušit',
	new: 'Nový',
	export: 'Exportovat',

	// Event related
	event: 'Událost',
	events: 'Události',
	newEvent: 'Nová událost',
	title: 'Název',
	description: 'Popis',
	location: 'Místo',
	allDay: 'Celý den',
	startDate: 'Datum zahájení',
	endDate: 'Datum ukončení',
	startTime: 'Čas zahájení',
	endTime: 'Čas ukončení',
	color: 'Barva',

	// Event form
	createEvent: 'Vytvořit událost',
	editEvent: 'Upravit událost',
	addNewEvent: 'Přidat novou událost',
	editEventDetails: 'Upravit detaily události',
	eventTitlePlaceholder: 'Zadejte název události...',
	eventDescriptionPlaceholder: 'Zadejte popis události...',
	eventLocationPlaceholder: 'Zadejte místo události...',

	// Recurrence
	repeat: 'Opakovat',
	repeats: 'Opakuje se',
	customRecurrence: 'Vlastní opakování',
	daily: 'Denně',
	weekly: 'Týdně',
	monthly: 'Měsíčně',
	yearly: 'Ročně',
	interval: 'Interval',
	repeatOn: 'Opakovat v',
	never: 'Nikdy',
	count: 'Počet',
	every: 'Každý',
	ends: 'Končí',
	after: 'Po',
	occurrences: 'Opakování',
	on: 'V',

	// Recurrence edit dialog
	editRecurringEvent: 'Upravit opakující se událost',
	deleteRecurringEvent: 'Smazat opakující se událost',
	editRecurringEventQuestion: 'Jak chcete upravit tuto opakující se událost?',
	deleteRecurringEventQuestion: 'Jak chcete smazat tuto opakující se událost?',
	thisEvent: 'Tato událost',
	thisEventDescription: 'Pouze tento výskyt',
	thisAndFollowingEvents: 'Tato a následující události',
	thisAndFollowingEventsDescription: 'Tento a všechny budoucí výskyty',
	allEvents: 'Všechny události',
	allEventsDescription: 'Všechny výskyty v sérii',
	onlyChangeThis: 'Změnit pouze tuto',
	changeThisAndFuture: 'Změnit tuto a budoucí',
	changeEntireSeries: 'Změnit celou sérii',
	onlyDeleteThis: 'Smazat pouze tuto',
	deleteThisAndFuture: 'Smazat tuto a budoucí',
	deleteEntireSeries: 'Smazat celou sérii',

	// View types
	month: 'Měsíc',
	week: 'Týden',
	day: 'Den',
	year: 'Rok',
	more: 'Více',

	// Resource calendar
	resources: 'Zdroje',
	resource: 'Zdroj',
	time: 'Čas',
	date: 'Datum',
	noResourcesVisible: 'Žádné viditelné zdroje',
	addResourcesOrShowExisting: 'Přidejte zdroje nebo zobrazte stávající',
}
