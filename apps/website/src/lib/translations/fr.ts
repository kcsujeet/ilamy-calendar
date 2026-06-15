import type { Translations } from '@ilamy/calendar'

export const fr: Partial<Translations> = {
	// Common actions
	today: "Aujourd'hui",
	create: 'Créer',
	update: 'Mettre à jour',
	delete: 'Supprimer',
	cancel: 'Annuler',
	new: 'Nouveau',
	export: 'Exporter',

	// Event related
	event: 'Événement',
	events: 'Événements',
	newEvent: 'Nouvel Événement',
	title: 'Titre',
	description: 'Description',
	location: 'Lieu',
	allDay: 'Toute la Journée',
	startDate: 'Date de Début',
	endDate: 'Date de Fin',
	startTime: 'Heure de Début',
	endTime: 'Heure de Fin',
	color: 'Couleur',

	// Event form
	createEvent: 'Créer un Événement',
	editEvent: "Modifier l'Événement",
	addNewEvent: 'Ajouter un Nouvel Événement',
	editEventDetails: "Modifier les Détails de l'Événement",
	eventTitlePlaceholder: "Saisir le titre de l'événement...",
	eventDescriptionPlaceholder: "Saisir la description de l'événement...",
	eventLocationPlaceholder: "Saisir le lieu de l'événement...",

	// Recurrence
	repeat: 'Répéter',
	repeats: 'Répète',
	customRecurrence: 'Récurrence Personnalisée',
	daily: 'Quotidien',
	weekly: 'Hebdomadaire',
	monthly: 'Mensuel',
	yearly: 'Annuel',
	interval: 'Intervalle',
	repeatOn: 'Répéter Le',
	never: 'Jamais',
	count: 'Nombre',
	every: 'Chaque',
	ends: 'Se termine',
	after: 'Après',
	occurrences: 'Occurrences',
	on: 'Le',

	// Recurrence edit dialog
	editRecurringEvent: "Modifier l'Événement Récurrent",
	deleteRecurringEvent: "Supprimer l'Événement Récurrent",
	editRecurringEventQuestion:
		'Comment souhaitez-vous modifier cet événement récurrent ?',
	deleteRecurringEventQuestion:
		'Comment souhaitez-vous supprimer cet événement récurrent ?',
	thisEvent: 'Cet Événement',
	thisEventDescription: 'Uniquement cette occurrence',
	thisAndFollowingEvents: 'Cet Événement et les Suivants',
	thisAndFollowingEventsDescription: 'Cette occurrence et toutes les futures',
	allEvents: 'Tous les Événements',
	allEventsDescription: 'Toutes les occurrences de la série',
	onlyChangeThis: 'Modifier Seulement Ceci',
	changeThisAndFuture: 'Modifier Ceci et les Futurs',
	changeEntireSeries: 'Modifier la Série Entière',
	onlyDeleteThis: 'Supprimer Seulement Ceci',
	deleteThisAndFuture: 'Supprimer Ceci et les Futurs',
	deleteEntireSeries: 'Supprimer la Série Entière',

	// View types
	month: 'Mois',
	week: 'Semaine',
	day: 'Jour',
	year: 'Année',
	more: 'Plus',

	// Resource calendar
	resources: 'Ressources',
	resource: 'Ressource',
	time: 'Heure',
	date: 'Date',
	noResourcesVisible: 'Aucune ressource visible',
	addResourcesOrShowExisting:
		'Ajouter des ressources ou afficher les existantes',
}
