import type { Translations } from '@ilamy/calendar'

export const ru: Partial<Translations> = {
	// Common actions
	today: 'Сегодня',
	create: 'Создать',
	update: 'Обновить',
	delete: 'Удалить',
	cancel: 'Отменить',
	new: 'Новый',
	export: 'Экспорт',

	// Event related
	event: 'Событие',
	events: 'События',
	newEvent: 'Новое Событие',
	title: 'Заголовок',
	description: 'Описание',
	location: 'Место',
	allDay: 'Весь День',
	startDate: 'Дата Начала',
	endDate: 'Дата Окончания',
	startTime: 'Время Начала',
	endTime: 'Время Окончания',
	color: 'Цвет',

	// Event form
	createEvent: 'Создать Событие',
	editEvent: 'Редактировать Событие',
	addNewEvent: 'Добавить Новое Событие',
	editEventDetails: 'Редактировать Детали События',
	eventTitlePlaceholder: 'Введите название события...',
	eventDescriptionPlaceholder: 'Введите описание события...',
	eventLocationPlaceholder: 'Введите место события...',

	// Recurrence
	repeat: 'Повторить',
	repeats: 'Повторяется',
	customRecurrence: 'Пользовательское Повторение',
	daily: 'Ежедневно',
	weekly: 'Еженедельно',
	monthly: 'Ежемесячно',
	yearly: 'Ежегодно',
	interval: 'Интервал',
	repeatOn: 'Повторять В',
	never: 'Никогда',
	count: 'Количество',
	every: 'Каждые',
	ends: 'Заканчивается',
	after: 'После',
	occurrences: 'Повторений',
	on: 'В',

	// Recurrence edit dialog
	editRecurringEvent: 'Редактировать Повторяющееся Событие',
	deleteRecurringEvent: 'Удалить Повторяющееся Событие',
	editRecurringEventQuestion:
		'Как вы хотите отредактировать это повторяющееся событие?',
	deleteRecurringEventQuestion:
		'Как вы хотите удалить это повторяющееся событие?',
	thisEvent: 'Это Событие',
	thisEventDescription: 'Только это событие',
	thisAndFollowingEvents: 'Это и Следующие События',
	thisAndFollowingEventsDescription: 'Это и все будущие события',
	allEvents: 'Все События',
	allEventsDescription: 'Все события в серии',
	onlyChangeThis: 'Изменить Только Это',
	changeThisAndFuture: 'Изменить Это и Будущие',
	changeEntireSeries: 'Изменить Всю Серию',
	onlyDeleteThis: 'Удалить Только Это',
	deleteThisAndFuture: 'Удалить Это и Будущие',
	deleteEntireSeries: 'Удалить Всю Серию',

	// View types
	month: 'Месяц',
	week: 'Неделя',
	day: 'День',
	year: 'Год',
	more: 'Больше',

	// Resource calendar
	resources: 'Ресурсы',
	resource: 'Ресурс',
	time: 'Время',
	date: 'Дата',
	noResourcesVisible: 'Нет видимых ресурсов',
	addResourcesOrShowExisting: 'Добавить ресурсы или показать существующие',
}
