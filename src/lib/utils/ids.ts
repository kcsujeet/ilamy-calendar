import type dayjs from '@/lib/configs/dayjs-config'

/**
 * Utility functions for generating consistent IDs, keys, and data-testids across components.
 */
export const ids = {
	/**
	 * Generates an ID for a day cell in the grid.
	 * Format: `day-cell-{YYYY-MM-DD}` or `day-cell-{YYYY-MM-DD}-{HH}-{mm}`
	 * Optional resourceId suffix: `-resource-{resourceId}`
	 */
	dayCell: (
		date: dayjs.Dayjs,
		time?: { hour: number; minute: number },
		resourceId?: string | number
	) => {
		const dateStr = date.format('YYYY-MM-DD')
		let baseId = `day-cell-${dateStr}`

		if (time) {
			const hourStr = time.hour.toString().padStart(2, '0')
			const minuteStr = time.minute.toString().padStart(2, '0')
			baseId = `${baseId}-${hourStr}-${minuteStr}`
		}

		if (resourceId) {
			return `${baseId}-resource-${resourceId}`
		}

		return baseId
	},

	/**
	 * Generates an ID for a resource row (horizontal view).
	 */
	resourceRow: (resourceId: string | number) => `horizontal-row-${resourceId}`,

	/**
	 * Generates an ID for a resource cell (vertical view or header).
	 */
	resourceCell: (resourceId: string | number) => `resource-cell-${resourceId}`,

	/**
	 * Generates an ID for an event element.
	 */
	event: (eventId: string | number) => `event-${eventId}`,

	/**
	 * Generates a test ID for a weekday header.
	 */
	weekdayHeader: (dayName: string) => `weekday-header-${dayName.toLowerCase()}`,

	/**
	 * Generates an ID for the day number component.
	 */
	dayNumber: {
		root: (date: dayjs.Dayjs) => `day-number-${date.format('YYYY-MM-DD')}`,
		today: 'day-number-today',
	},

	/**
	 * Static IDs for specific components.
	 */
	currentTimeIndicator: 'current-time-indicator',
	calendarHeader: 'calendar-header',
	calendarMonthButton: 'calendar-month-button',
	calendarMonthDisplay: 'calendar-month-display',
	monthHeader: 'month-header',
	allDayRow: 'all-day-row',
	demoPage: 'demo-page',

	/**
	 * Horizontal Grid IDs
	 */
	horizontalGrid: {
		scroll: 'horizontal-grid-scroll',
		header: 'horizontal-grid-header',
		body: 'horizontal-grid-body',
	},

	/**
	 * Vertical Grid IDs
	 */
	verticalGrid: {
		scroll: 'vertical-grid-scroll',
		header: 'vertical-grid-header',
		body: 'vertical-grid-body',
		allDay: 'vertical-grid-all-day',
	},

	/**
	 * Resource View IDs
	 */
	resourceView: {
		day: 'resource-day',
		week: 'resource-week',
		month: 'resource-month-vertical-grid',
		monthHeader: 'resource-month-header',
		timeLabel: (hour: string) => `resource-time-label-${hour}`,
	},

	/**
	 * Time Picker ID
	 */
	timePicker: (name: string) => `time-picker-${name}`,

	/**
	 * Recurrence Editor IDs
	 */
	recurrence: {
		editor: 'recurrence-editor',
		toggle: 'toggle-recurrence',
		frequencySelect: 'frequency-select',
		countInput: 'count-input',
	},

	/**
	 * Custom Event Form IDs (mostly for testing/demos)
	 */
	customForm: {
		container: 'custom-event-form',
		status: 'form-open',
		title: 'selected-event-title',
		id: 'selected-event-id',
		resourceId: 'selected-event-resource-id',
		resourceIds: 'selected-event-resource-ids',
		addBtn: 'add-event-btn',
		addCrossResourceBtn: 'add-cross-resource-event-btn',
		updateBtn: 'update-event-btn',
		updateResourceBtn: 'update-event-resource-btn',
		deleteBtn: 'delete-event-btn',
		closeBtn: 'close-form-btn',
	},

	/**
	 * All Events Dialog IDs
	 */
	allEventsDialog: {
		root: 'all-events-dialog',
		event: (eventId: string | number) => `all-events-dialog-event-${eventId}`,
	},

	/**
	 * Year View IDs
	 */
	yearView: {
		container: 'year-view',
		grid: 'year-grid',
		month: (key: string) => `year-month-${key}`,
		monthTitle: (key: string) => `year-month-title-${key}`,
		eventCount: (key: string) => `year-month-event-count-${key}`,
		miniCalendar: (key: string) => `year-mini-calendar-${key}`,
	},

	/**
	 * Test helpers
	 */
	test: {
		currentView: 'current-view',
		businessHours: 'business-hours',
		weekStartDay: 'week-start-day',
		weekStartDate: 'week-start-date',
		weekEndDay: 'week-end-day',
		weekEndDate: 'week-end-date',
		monthStartDay: 'month-start-day',
		monthStartDate: 'month-start-date',
		monthEndDay: 'month-end-day',
		monthEndDate: 'month-end-date',
		eventsCount: 'events-count',
	},

	/**
	 * Generates an ID for a time column label.
	 */
	timeColumnLabel: (hour: string) => `vertical-time-${hour}`,

	/**
	 * Generates a key/ID for a horizontal grid row event layer.
	 */
	horizontalEvents: (resourceId: string | number) =>
		`horizontal-events-${resourceId}`,

	/**
	 * Generates a key/ID for a vertical grid column event layer.
	 */
	verticalEvents: (id: string | number) => `vertical-events-${id}`,

	/**
	 * Generates an ID for a vertical grid column.
	 */
	verticalColumn: (id: string) => `vertical-col-${id}`,

	/**
	 * Generates a key wrapper for draggable events.
	 */
	draggableEventWrapper: (
		eventId: string | number,
		position: number,
		dateStr: string,
		resourceId: string | number = 'no-resource'
	) => `${eventId}-${position}-${dateStr}-${resourceId}-wrapper`,
}
