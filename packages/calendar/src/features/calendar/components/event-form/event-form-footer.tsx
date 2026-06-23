import { Button } from '@ilamy/ui/components/button'
import { DialogFooter } from '@ilamy/ui/components/dialog'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { EventFormValues } from './event-form-schema'

interface EventFormFooterProps {
	isEdit: boolean
	/** True when a resource must be chosen before the event can be created. */
	requiresResource: boolean
	onCancel: () => void
	onDelete: () => void
}

/**
 * Delete / cancel / submit row. Derives the submit-disabled state from the
 * watched `resourceId` (via context), so the parent only wires the orchestration
 * callbacks and whether this is an edit.
 */
export function EventFormFooter({
	isEdit,
	requiresResource,
	onCancel,
	onDelete,
}: EventFormFooterProps) {
	const t = useSmartCalendarContext((context) => context.t)
	const { control } = useFormContext<EventFormValues>()
	const resourceId = useWatch({ control, name: 'resourceId' })
	const submitDisabled = requiresResource && resourceId === undefined

	return (
		<DialogFooter className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:gap-0">
			{isEdit && (
				<Button
					className="w-full sm:mr-auto sm:w-auto"
					onClick={onDelete}
					size="sm"
					type="button"
					variant="destructive"
				>
					{t('delete')}
				</Button>
			)}
			<div className="flex w-full gap-2 sm:w-auto">
				<Button
					className="flex-1 sm:flex-none"
					onClick={onCancel}
					size="sm"
					type="button"
					variant="outline"
				>
					{t('cancel')}
				</Button>
				<Button
					className="flex-1 sm:flex-none"
					disabled={submitDisabled}
					size="sm"
					type="submit"
				>
					{isEdit ? t('update') : t('create')}
				</Button>
			</div>
		</DialogFooter>
	)
}
