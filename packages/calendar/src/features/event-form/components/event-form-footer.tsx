import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'

interface EventFormFooterProps {
	isExistingEvent: boolean
	isSubmitDisabled: boolean
	onDelete: () => void
	onClose: () => void
}

/** Action bar with Delete (existing events), Cancel, and Create/Update submit buttons. */
export const EventFormFooter = ({
	isExistingEvent,
	isSubmitDisabled,
	onDelete,
	onClose,
}: EventFormFooterProps) => {
	const t = useSmartCalendarContext((context) => context.t)
	const { Button } = useCalendarComponents()

	return (
		<div className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
			{isExistingEvent && (
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
					onClick={onClose}
					size="sm"
					type="button"
					variant="outline"
				>
					{t('cancel')}
				</Button>
				<Button
					className="flex-1 sm:flex-none"
					disabled={isSubmitDisabled}
					size="sm"
					type="submit"
				>
					{isExistingEvent ? t('update') : t('create')}
				</Button>
			</div>
		</div>
	)
}
