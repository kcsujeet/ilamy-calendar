import type { Resource } from '@ilamy/calendar'
import { Card } from '@ilamy/ui/components/card'

type DemoResourcePickerProps = {
	resources: Resource[]
	selectedResourceIds: Set<string | number>
	onToggleResource: (id: string | number) => void
}

// Lets the user swap the resources prop at runtime to verify that
// IlamyResourceCalendar reacts to prop changes (issue #153).
export function DemoResourcePicker({
	resources,
	selectedResourceIds,
	onToggleResource,
}: DemoResourcePickerProps) {
	return (
		<Card className="p-4">
			<h3 className="font-semibold mb-3">Demo Resources</h3>
			<div className="space-y-2 text-sm">
				{resources.map((resource) => {
					const id = `resource-toggle-${resource.id}`
					return (
						<label
							className="flex items-center gap-2 cursor-pointer"
							htmlFor={id}
							key={resource.id}
						>
							<input
								checked={selectedResourceIds.has(resource.id)}
								id={id}
								onChange={() => onToggleResource(resource.id)}
								type="checkbox"
							/>
							<div
								className="w-3 h-3 rounded"
								style={{ backgroundColor: resource.color }}
							/>
							<span>{resource.title}</span>
						</label>
					)
				})}
			</div>
			<div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
				Toggle resources on/off to verify the calendar reacts to{' '}
				<code>resources</code> prop changes without remounting.
			</div>
		</Card>
	)
}
