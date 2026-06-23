import { FormColorPicker } from '@/components/form/form-color-picker'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

const COLOR_OPTIONS = [
	{ value: 'bg-blue-100 text-blue-800', label: 'Blue' },
	{ value: 'bg-green-100 text-green-800', label: 'Green' },
	{ value: 'bg-purple-100 text-purple-800', label: 'Purple' },
	{ value: 'bg-red-100 text-red-800', label: 'Red' },
	{ value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
	{ value: 'bg-pink-100 text-pink-800', label: 'Pink' },
	{ value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
	{ value: 'bg-amber-100 text-amber-800', label: 'Amber' },
	{ value: 'bg-emerald-100 text-emerald-800', label: 'Emerald' },
	{ value: 'bg-sky-100 text-sky-800', label: 'Sky' },
	{ value: 'bg-violet-100 text-violet-800', label: 'Violet' },
	{ value: 'bg-rose-100 text-rose-800', label: 'Rose' },
	{ value: 'bg-teal-100 text-teal-800', label: 'Teal' },
	{ value: 'bg-orange-100 text-orange-800', label: 'Orange' },
]

/** The event color swatch picker, bound to the `color` field. */
export function EventColorField() {
	const t = useSmartCalendarContext((context) => context.t)
	return (
		<FormColorPicker label={t('color')} name="color" options={COLOR_OPTIONS} />
	)
}
