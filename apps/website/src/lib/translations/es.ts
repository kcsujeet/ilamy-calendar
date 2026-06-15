import type { Translations } from '@ilamy/calendar'

export const es: Partial<Translations> = {
	// Common actions
	today: 'Hoy',
	create: 'Crear',
	update: 'Actualizar',
	delete: 'Eliminar',
	cancel: 'Cancelar',
	new: 'Nuevo',
	export: 'Exportar',

	// Event related
	event: 'Evento',
	events: 'Eventos',
	newEvent: 'Nuevo Evento',
	title: 'Título',
	description: 'Descripción',
	location: 'Ubicación',
	allDay: 'Todo el Día',
	startDate: 'Fecha de Inicio',
	endDate: 'Fecha de Fin',
	startTime: 'Hora de Inicio',
	endTime: 'Hora de Fin',
	color: 'Color',

	// Event form
	createEvent: 'Crear Evento',
	editEvent: 'Editar Evento',
	addNewEvent: 'Agregar Nuevo Evento',
	editEventDetails: 'Editar Detalles del Evento',
	eventTitlePlaceholder: 'Ingrese el título del evento...',
	eventDescriptionPlaceholder: 'Ingrese la descripción del evento...',
	eventLocationPlaceholder: 'Ingrese la ubicación del evento...',

	// Recurrence
	repeat: 'Repetir',
	repeats: 'Repite',
	customRecurrence: 'Recurrencia Personalizada',
	daily: 'Diario',
	weekly: 'Semanal',
	monthly: 'Mensual',
	yearly: 'Anual',
	interval: 'Intervalo',
	repeatOn: 'Repetir En',
	never: 'Nunca',
	count: 'Cantidad',
	every: 'Cada',
	ends: 'Termina',
	after: 'Después',
	occurrences: 'Ocurrencias',
	on: 'En',

	// Recurrence edit dialog
	editRecurringEvent: 'Editar Evento Recurrente',
	deleteRecurringEvent: 'Eliminar Evento Recurrente',
	editRecurringEventQuestion:
		'¿Cómo le gustaría editar este evento recurrente?',
	deleteRecurringEventQuestion:
		'¿Cómo le gustaría eliminar este evento recurrente?',
	thisEvent: 'Este Evento',
	thisEventDescription: 'Solo esta ocurrencia',
	thisAndFollowingEvents: 'Este y Eventos Siguientes',
	thisAndFollowingEventsDescription: 'Esta y todas las ocurrencias futuras',
	allEvents: 'Todos los Eventos',
	allEventsDescription: 'Todas las ocurrencias en la serie',
	onlyChangeThis: 'Solo Cambiar Este',
	changeThisAndFuture: 'Cambiar Este y Futuros',
	changeEntireSeries: 'Cambiar Serie Completa',
	onlyDeleteThis: 'Solo Eliminar Este',
	deleteThisAndFuture: 'Eliminar Este y Futuros',
	deleteEntireSeries: 'Eliminar Serie Completa',

	// View types
	month: 'Mes',
	week: 'Semana',
	day: 'Día',
	year: 'Año',
	more: 'Más',

	// Resource calendar
	resources: 'Recursos',
	resource: 'Recurso',
	time: 'Hora',
	date: 'Fecha',
	noResourcesVisible: 'No hay recursos visibles',
	addResourcesOrShowExisting: 'Agregar recursos o mostrar los existentes',
}
