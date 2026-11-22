import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'

interface ResourceSelectProps {
	value: string | number | undefined
	onChange: (resourceId: string | number) => void
}

/** Resource dropdown shown when creating an event on a resource calendar without a preselected resource. */
export const ResourceSelect = ({ value, onChange }: ResourceSelectProps) => {
	const { t, resources } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources ?? [],
	}))
	const { Label, Select } = useCalendarComponents()

	const resolveResourceId = (selected: string): string | number => {
		const resource = resources.find((item) => String(item.id) === selected)
		return resource?.id ?? selected
	}

	const options = resources.map((resource) => ({
		value: String(resource.id),
		label: resource.title,
	}))
	const selectedValue = value === undefined ? '' : String(value)

	return (
		<div className="grid gap-1 sm:gap-2">
			<Label className="text-xs sm:text-sm" htmlFor="resource">
				{t('resource')}
			</Label>
			<div data-testid="resource-select">
				<Select
					className="h-8 text-sm sm:h-9"
					id="resource"
					onValueChange={(selected) => onChange(resolveResourceId(selected))}
					options={options}
					placeholder={t('selectResource')}
					value={selectedValue}
				/>
			</div>
		</div>
	)
}
