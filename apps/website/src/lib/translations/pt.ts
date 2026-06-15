import type { Translations } from '@ilamy/calendar'

export const pt: Partial<Translations> = {
	// Common actions
	today: 'Hoje',
	create: 'Criar',
	update: 'Atualizar',
	delete: 'Excluir',
	cancel: 'Cancelar',
	new: 'Novo',
	export: 'Exportar',

	// Event related
	event: 'Evento',
	events: 'Eventos',
	newEvent: 'Novo Evento',
	title: 'Título',
	description: 'Descrição',
	location: 'Local',
	allDay: 'Dia Inteiro',
	startDate: 'Data de Início',
	endDate: 'Data de Fim',
	startTime: 'Hora de Início',
	endTime: 'Hora de Fim',
	color: 'Cor',

	// Event form
	createEvent: 'Criar Evento',
	editEvent: 'Editar Evento',
	addNewEvent: 'Adicionar Novo Evento',
	editEventDetails: 'Editar Detalhes do Evento',
	eventTitlePlaceholder: 'Digite o título do evento...',
	eventDescriptionPlaceholder: 'Digite a descrição do evento...',
	eventLocationPlaceholder: 'Digite o local do evento...',

	// Recurrence
	repeat: 'Repetir',
	repeats: 'Repete',
	customRecurrence: 'Recorrência Personalizada',
	daily: 'Diário',
	weekly: 'Semanal',
	monthly: 'Mensal',
	yearly: 'Anual',
	interval: 'Intervalo',
	repeatOn: 'Repetir Em',
	never: 'Nunca',
	count: 'Contagem',
	every: 'A cada',
	ends: 'Termina',
	after: 'Após',
	occurrences: 'Ocorrências',
	on: 'Em',

	// Recurrence edit dialog
	editRecurringEvent: 'Editar Evento Recorrente',
	deleteRecurringEvent: 'Excluir Evento Recorrente',
	editRecurringEventQuestion:
		'Como você gostaria de editar este evento recorrente?',
	deleteRecurringEventQuestion:
		'Como você gostaria de excluir este evento recorrente?',
	thisEvent: 'Este Evento',
	thisEventDescription: 'Apenas esta ocorrência',
	thisAndFollowingEvents: 'Este e Eventos Seguintes',
	thisAndFollowingEventsDescription: 'Esta e todas as ocorrências futuras',
	allEvents: 'Todos os Eventos',
	allEventsDescription: 'Todas as ocorrências na série',
	onlyChangeThis: 'Alterar Apenas Este',
	changeThisAndFuture: 'Alterar Este e Futuros',
	changeEntireSeries: 'Alterar Série Inteira',
	onlyDeleteThis: 'Excluir Apenas Este',
	deleteThisAndFuture: 'Excluir Este e Futuros',
	deleteEntireSeries: 'Excluir Série Inteira',

	// View types
	month: 'Mês',
	week: 'Semana',
	day: 'Dia',
	year: 'Ano',
	more: 'Mais',

	// Resource calendar
	resources: 'Recursos',
	resource: 'Recurso',
	time: 'Hora',
	date: 'Data',
	noResourcesVisible: 'Nenhum recurso visível',
	addResourcesOrShowExisting: 'Adicionar recursos ou mostrar os existentes',
}
