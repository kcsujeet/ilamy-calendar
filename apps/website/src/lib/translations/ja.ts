import type { Translations } from '@ilamy/calendar'

export const ja: Partial<Translations> = {
	// Common actions
	today: '今日',
	create: '作成',
	update: '更新',
	delete: '削除',
	cancel: 'キャンセル',
	new: '新規',
	export: 'エクスポート',

	// Event related
	event: 'イベント',
	events: 'イベント',
	newEvent: '新しいイベント',
	title: 'タイトル',
	description: '説明',
	location: '場所',
	allDay: '終日',
	startDate: '開始日',
	endDate: '終了日',
	startTime: '開始時刻',
	endTime: '終了時刻',
	color: '色',

	// Event form
	createEvent: 'イベントを作成',
	editEvent: 'イベントを編集',
	addNewEvent: '新しいイベントを追加',
	editEventDetails: 'イベントの詳細を編集',
	eventTitlePlaceholder: 'イベントタイトルを入力してください...',
	eventDescriptionPlaceholder: 'イベントの説明を入力してください...',
	eventLocationPlaceholder: 'イベントの場所を入力してください...',

	// Recurrence
	repeat: '繰り返し',
	repeats: '繰り返し',
	customRecurrence: 'カスタム繰り返し',
	daily: '毎日',
	weekly: '毎週',
	monthly: '毎月',
	yearly: '毎年',
	interval: '間隔',
	repeatOn: '繰り返し日',
	never: 'なし',
	count: '回数',
	every: '毎',
	ends: '終了',
	after: '後',
	occurrences: '回',
	on: '日',

	// Recurrence edit dialog
	editRecurringEvent: '繰り返しイベントを編集',
	deleteRecurringEvent: '繰り返しイベントを削除',
	editRecurringEventQuestion: 'この繰り返しイベントをどのように編集しますか？',
	deleteRecurringEventQuestion:
		'この繰り返しイベントをどのように削除しますか？',
	thisEvent: 'このイベント',
	thisEventDescription: 'このイベントのみ',
	thisAndFollowingEvents: 'このイベントと以降のイベント',
	thisAndFollowingEventsDescription: 'このイベントと今後のすべてのイベント',
	allEvents: 'すべてのイベント',
	allEventsDescription: 'シリーズのすべてのイベント',
	onlyChangeThis: 'これのみ変更',
	changeThisAndFuture: 'これと今後を変更',
	changeEntireSeries: 'シリーズ全体を変更',
	onlyDeleteThis: 'これのみ削除',
	deleteThisAndFuture: 'これと今後を削除',
	deleteEntireSeries: 'シリーズ全体を削除',

	// View types
	month: '月',
	week: '週',
	day: '日',
	year: '年',
	more: 'もっと',

	// Resource calendar
	resources: 'リソース',
	resource: 'リソース',
	time: '時間',
	date: '日付',
	noResourcesVisible: '表示可能なリソースがありません',
	addResourcesOrShowExisting: 'リソースを追加または既存のリソースを表示',
}
