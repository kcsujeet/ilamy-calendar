import type { Translations } from '@ilamy/calendar'

export const zh: Partial<Translations> = {
	// Common actions
	today: '今天',
	create: '创建',
	update: '更新',
	delete: '删除',
	cancel: '取消',
	new: '新建',
	export: '导出',

	// Event related
	event: '事件',
	events: '事件',
	newEvent: '新事件',
	title: '标题',
	description: '描述',
	location: '地点',
	allDay: '全天',
	startDate: '开始日期',
	endDate: '结束日期',
	startTime: '开始时间',
	endTime: '结束时间',
	color: '颜色',

	// Event form
	createEvent: '创建事件',
	editEvent: '编辑事件',
	addNewEvent: '添加新事件',
	editEventDetails: '编辑事件详情',
	eventTitlePlaceholder: '请输入事件标题...',
	eventDescriptionPlaceholder: '请输入事件描述...',
	eventLocationPlaceholder: '请输入事件地点...',

	// Recurrence
	repeat: '重复',
	repeats: '重复',
	customRecurrence: '自定义重复',
	daily: '每天',
	weekly: '每周',
	monthly: '每月',
	yearly: '每年',
	interval: '间隔',
	repeatOn: '重复时间',
	never: '从不',
	count: '次数',
	every: '每',
	ends: '结束',
	after: '之后',
	occurrences: '次',
	on: '在',

	// Recurrence edit dialog
	editRecurringEvent: '编辑重复事件',
	deleteRecurringEvent: '删除重复事件',
	editRecurringEventQuestion: '您想如何编辑这个重复事件？',
	deleteRecurringEventQuestion: '您想如何删除这个重复事件？',
	thisEvent: '此事件',
	thisEventDescription: '仅此次事件',
	thisAndFollowingEvents: '此事件及后续事件',
	thisAndFollowingEventsDescription: '此次及所有未来事件',
	allEvents: '所有事件',
	allEventsDescription: '系列中的所有事件',
	onlyChangeThis: '仅更改此次',
	changeThisAndFuture: '更改此次及未来',
	changeEntireSeries: '更改整个系列',
	onlyDeleteThis: '仅删除此次',
	deleteThisAndFuture: '删除此次及未来',
	deleteEntireSeries: '删除整个系列',

	// View types
	month: '月',
	week: '周',
	day: '日',
	year: '年',
	more: '更多',

	// Resource calendar
	resources: '资源',
	resource: '资源',
	time: '时间',
	date: '日期',
	noResourcesVisible: '没有可见的资源',
	addResourcesOrShowExisting: '添加资源或显示现有资源',
}
