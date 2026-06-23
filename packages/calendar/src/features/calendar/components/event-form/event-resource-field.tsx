import { FormSelect } from '@/components/form/form-select'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

/**
 * The resource selector. Reads the resource list from calendar context and binds
 * to the `resourceId` field; the parent decides whether to render it (only when
 * the calendar has resources and none was preselected).
 */
export function EventResourceField() {
	const { t, resources } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources ?? [],
	}))

	const resolveResourceId = (value: string): string | number => {
		const resource = resources.find((item) => String(item.id) === value)
		return resource?.id ?? value
	}

	const options = resources.map((resource) => ({
		value: String(resource.id),
		label: resource.title,
	}))

	return (
		<FormSelect
			label={t('resource')}
			name="resourceId"
			options={options}
			parseValue={resolveResourceId}
			placeholder={t('selectResource')}
			testId="resource-select"
		/>
	)
}
