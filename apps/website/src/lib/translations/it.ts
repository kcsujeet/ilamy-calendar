import type { Translations } from '@ilamy/calendar'

export const it: Partial<Translations> = {
	// Common actions
	today: 'Oggi',
	create: 'Crea',
	update: 'Aggiorna',
	delete: 'Elimina',
	cancel: 'Annulla',
	new: 'Nuovo',
	export: 'Esporta',

	// Event related
	event: 'Evento',
	events: 'Eventi',
	newEvent: 'Nuovo Evento',
	title: 'Titolo',
	description: 'Descrizione',
	location: 'Luogo',
	allDay: 'Tutto il Giorno',
	startDate: 'Data di Inizio',
	endDate: 'Data di Fine',
	startTime: 'Ora di Inizio',
	endTime: 'Ora di Fine',
	color: 'Colore',

	// Event form
	createEvent: 'Crea Evento',
	editEvent: 'Modifica Evento',
	addNewEvent: 'Aggiungi Nuovo Evento',
	editEventDetails: 'Modifica Dettagli Evento',
	eventTitlePlaceholder: "Inserisci il titolo dell'evento...",
	eventDescriptionPlaceholder: "Inserisci la descrizione dell'evento...",
	eventLocationPlaceholder: "Inserisci il luogo dell'evento...",

	// Recurrence
	repeat: 'Ripeti',
	repeats: 'Ripete',
	customRecurrence: 'Ricorrenza Personalizzata',
	daily: 'Giornaliero',
	weekly: 'Settimanale',
	monthly: 'Mensile',
	yearly: 'Annuale',
	interval: 'Intervallo',
	repeatOn: 'Ripeti Il',
	never: 'Mai',
	count: 'Conteggio',
	every: 'Ogni',
	ends: 'Finisce',
	after: 'Dopo',
	occurrences: 'Occorrenze',
	on: 'Il',

	// Recurrence edit dialog
	editRecurringEvent: 'Modifica Evento Ricorrente',
	deleteRecurringEvent: 'Elimina Evento Ricorrente',
	editRecurringEventQuestion:
		'Come vorresti modificare questo evento ricorrente?',
	deleteRecurringEventQuestion:
		'Come vorresti eliminare questo evento ricorrente?',
	thisEvent: 'Questo Evento',
	thisEventDescription: 'Solo questa occorrenza',
	thisAndFollowingEvents: 'Questo e Eventi Successivi',
	thisAndFollowingEventsDescription: 'Questa e tutte le occorrenze future',
	allEvents: 'Tutti gli Eventi',
	allEventsDescription: 'Tutte le occorrenze nella serie',
	onlyChangeThis: 'Cambia Solo Questo',
	changeThisAndFuture: 'Cambia Questo e Futuri',
	changeEntireSeries: 'Cambia Intera Serie',
	onlyDeleteThis: 'Elimina Solo Questo',
	deleteThisAndFuture: 'Elimina Questo e Futuri',
	deleteEntireSeries: 'Elimina Intera Serie',

	// View types
	month: 'Mese',
	week: 'Settimana',
	day: 'Giorno',
	year: 'Anno',
	more: 'Altro',

	// Resource calendar
	resources: 'Risorse',
	resource: 'Risorsa',
	time: 'Ora',
	date: 'Data',
	noResourcesVisible: 'Nessuna risorsa visibile',
	addResourcesOrShowExisting: 'Aggiungi risorse o mostra quelle esistenti',
}
