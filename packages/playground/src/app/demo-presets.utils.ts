import {
	defaultSettings,
	type PlaygroundSettings,
} from '../types/settings-form.types'

export type DemoPresetId =
	| 'standard'
	| 'resource'
	| 'business-hours'
	| 'multi-zone'
	| 'read-only'

export interface DemoPreset {
	id: DemoPresetId
	label: string
	description: string
	patch: Partial<PlaygroundSettings>
}

export const DEMO_PRESETS: DemoPreset[] = [
	{
		id: 'standard',
		label: 'Standard',
		description: 'Full-featured calendar with all v4 plugins enabled',
		patch: {
			calendarType: 'regular',
			initialView: 'month',
			enableBusinessHours: false,
			constrainEventsToBusinessHours: false,
			constrainSelectToBusinessHours: false,
			disableDragAndDrop: false,
			nowIndicator: true,
			enableRecurrencePlugin: true,
			enableAgendaPlugin: true,
			enableDragToCreatePlugin: true,
			enableYearPlugin: true,
			enableIcalPlugin: true,
		},
	},
	{
		id: 'resource',
		label: 'Resources',
		description: 'Rooms & equipment scheduler across resource lanes',
		patch: {
			calendarType: 'resource',
			orientation: 'horizontal',
			weekViewGranularity: 'hourly',
			initialView: 'week',
			enableBusinessHours: false,
			disableDragAndDrop: false,
		},
	},
	{
		id: 'business-hours',
		label: 'Business Hours',
		description:
			'Weekdays 9–5 shaded; toggle constraints to compare shade-only vs enforced',
		patch: {
			calendarType: 'regular',
			initialView: 'week',
			enableBusinessHours: true,
			businessHoursDays: [
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
			],
			businessHoursStart: 9,
			businessHoursEnd: 17,
			constrainEventsToBusinessHours: true,
			constrainSelectToBusinessHours: true,
			disableDragAndDrop: false,
		},
	},
	{
		id: 'multi-zone',
		label: 'Multi-Zone',
		description:
			'Two live calendars side-by-side (New York & Tokyo) with zero global state',
		patch: {
			calendarType: 'multi-zone',
			initialView: 'week',
			timezone: 'America/New_York',
			secondaryTimezone: 'Asia/Tokyo',
			enableBusinessHours: false,
			disableDragAndDrop: false,
		},
	},
	{
		id: 'read-only',
		label: 'Read-Only',
		description: 'v4 default editable={false} view with no drag/resize handles',
		patch: {
			calendarType: 'regular',
			initialView: 'week',
			disableDragAndDrop: true,
			nowIndicator: false,
			enableBusinessHours: false,
		},
	},
]

export function detectActivePreset(
	values: PlaygroundSettings
): DemoPresetId | null {
	if (values.calendarType === 'multi-zone') {
		return 'multi-zone'
	}
	if (values.calendarType === 'resource') {
		return 'resource'
	}
	if (values.disableDragAndDrop) {
		return 'read-only'
	}
	if (values.enableBusinessHours) {
		return 'business-hours'
	}
	if (
		values.calendarType === defaultSettings.calendarType &&
		!values.enableBusinessHours &&
		!values.disableDragAndDrop
	) {
		return 'standard'
	}
	return null
}
