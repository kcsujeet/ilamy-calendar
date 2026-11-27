type Id = string | number

export const rendererKeys = {
	testId: {
		dayCell: (dateKey: string) => `day-cell-${dateKey}`,
		monthWeekday: (weekdayKey: string) => `month-header-weekday-${weekdayKey}`,
		weekWeekday: (weekdayKey: string) => `week-header-weekday-${weekdayKey}`,
		moreEvents: (dateKey: string) => `more-events-${dateKey}`,
		timeSlot: (dateKey: string, hour: number, minute: number) =>
			`time-slot-${dateKey}-${hour}-${minute}`,
		resourceHeader: (resourceId: Id) => `resource-header-${resourceId}`,
		resourceHourSlot: (resourceId: Id, dateKey: string, hour: number) =>
			`dom-resource-hour-slot-${resourceId}-${dateKey}-${hour}`,
		resourceWeekTimeLabel: (hourStr: string) =>
			`resource-week-time-label-${hourStr}`,
		eventBar: (eventId: Id, staticPill: boolean) =>
			staticPill
				? `all-events-dialog-event-${eventId}`
				: `calendar-event-${eventId}`,
		dragPreview: (axis: 'horizontal' | 'vertical') =>
			`event-drag-preview-${axis}`,
		resizeHandle: (edge: 'start' | 'end', eventId: Id) =>
			`resize-handle-${edge}-${eventId}`,
		viewBtn: (view: string) => `view-btn-${view}`,
		viewMenuItem: (view: string) => `view-menu-item-${view}`,
		agendaDay: (groupKey: string) => `agenda-day-${groupKey}`,
		agendaEvent: (eventId: Id) => `agenda-event-${eventId}`,
		scopeOption: (scope: string) => `dom-scope-${scope}`,
		modeView: (mode: string) => `dom-${mode}-view`,
		datePicker: (id: string) => `date-picker-${id}`,
		timePicker: (id: string) => `time-picker-${id}`,
	},
	key: {
		slot: (name: string, id: Id) => `${name}:${id}`,
		pluginSlot: (slotName: string, pluginName: string) =>
			`${slotName}:${pluginName}`,
		eventSlot: (id: Id, axis: string, isStart: boolean, isEnd: boolean) =>
			`event:${id}:${axis}:${isStart ? 's' : 'm'}:${isEnd ? 'e' : 'm'}`,
		monthEvent: (id: Id, left: number, width: number, row: number) =>
			`${id}:${left}:${width}:${row}`,
		previewEvent: (id: Id, leftOrTop: number, span: number) =>
			`preview:${id}:${leftOrTop}:${span}`,
		weekRow: (weekIndex: number) => `week-${weekIndex}`,
		weekdayCol: (label: string, idx: number) => `${label}-${idx}`,
		timeCol: (dateKey: string, resourceId: Id | undefined, idx: number) =>
			`col-${dateKey}-${resourceId ?? idx}`,
		timeHeader: (dateKey: string, resourceId: Id | undefined, idx: number) =>
			`${dateKey}-${resourceId ?? idx}`,
		allDayCell: (dateKey: string, resourceId: Id | undefined, idx: number) =>
			`all-day-${dateKey}-${resourceId ?? idx}`,
		hourMinute: (hour: number, minute: number) => `${hour}:${minute}`,
		timeAxisHour: (hour: number, index: number) => `${hour}-${index}`,
		resourceDay: (resourceId: Id, dateKey: string) =>
			`${resourceId}-${dateKey}`,
		hourlyBar: (id: Id, lane: number) => `${id}-${lane}`,
		groupDay: (dateKey: string) => `grp-${dateKey}`,
		groupHour: (dateKey: string, hour: number) => `hr-${dateKey}-${hour}`,
		agendaEntry: (id: Id, startStr: string) => `${id}-${startStr}`,
		dialogEvent: (id: Id, startStr: string) => `${id}-${startStr}`,
		eventFormKey: (
			id: Id | undefined,
			start: string,
			end: string,
			resourceId: Id | undefined
		) => `${id ?? 'new'}:${start}:${end}:${String(resourceId ?? '')}`,
		yearDot: (dateKey: string, dotNum: number) => `${dateKey}-dot-${dotNum}`,
	},
} as const
