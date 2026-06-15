import type { Translations } from '@ilamy/calendar'

export const ko: Partial<Translations> = {
	// Common actions
	today: '오늘',
	create: '생성',
	update: '업데이트',
	delete: '삭제',
	cancel: '취소',
	new: '새로 만들기',
	export: '내보내기',

	// Event related
	event: '이벤트',
	events: '이벤트',
	newEvent: '새 이벤트',
	title: '제목',
	description: '설명',
	location: '위치',
	allDay: '하루 종일',
	startDate: '시작 날짜',
	endDate: '종료 날짜',
	startTime: '시작 시간',
	endTime: '종료 시간',
	color: '색상',

	// Event form
	createEvent: '이벤트 생성',
	editEvent: '이벤트 편집',
	addNewEvent: '새 이벤트 추가',
	editEventDetails: '이벤트 세부사항 편집',
	eventTitlePlaceholder: '이벤트 제목을 입력하세요...',
	eventDescriptionPlaceholder: '이벤트 설명을 입력하세요...',
	eventLocationPlaceholder: '이벤트 위치를 입력하세요...',

	// Recurrence
	repeat: '반복',
	repeats: '반복',
	customRecurrence: '사용자 정의 반복',
	daily: '매일',
	weekly: '매주',
	monthly: '매월',
	yearly: '매년',
	interval: '간격',
	repeatOn: '반복 요일',
	never: '없음',
	count: '횟수',
	every: '매',
	ends: '종료',
	after: '후',
	occurrences: '회',
	on: '일',

	// Recurrence edit dialog
	editRecurringEvent: '반복 이벤트 편집',
	deleteRecurringEvent: '반복 이벤트 삭제',
	editRecurringEventQuestion: '이 반복 이벤트를 어떻게 편집하시겠습니까?',
	deleteRecurringEventQuestion: '이 반복 이벤트를 어떻게 삭제하시겠습니까?',
	thisEvent: '이 이벤트',
	thisEventDescription: '이 이벤트만',
	thisAndFollowingEvents: '이 이벤트와 이후 이벤트',
	thisAndFollowingEventsDescription: '이 이벤트와 모든 향후 이벤트',
	allEvents: '모든 이벤트',
	allEventsDescription: '시리즈의 모든 이벤트',
	onlyChangeThis: '이것만 변경',
	changeThisAndFuture: '이것과 향후 변경',
	changeEntireSeries: '전체 시리즈 변경',
	onlyDeleteThis: '이것만 삭제',
	deleteThisAndFuture: '이것과 향후 삭제',
	deleteEntireSeries: '전체 시리즈 삭제',

	// View types
	month: '월',
	week: '주',
	day: '일',
	year: '년',
	more: '더보기',

	// Resource calendar
	resources: '리소스',
	resource: '리소스',
	time: '시간',
	date: '날짜',
	noResourcesVisible: '표시할 리소스가 없습니다',
	addResourcesOrShowExisting: '리소스 추가 또는 기존 리소스 표시',
}
