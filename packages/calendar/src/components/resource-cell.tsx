import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface ResourceCellProps {
	resource: Resource
	className?: string
	children?: React.ReactNode
	'data-testid'?: string
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
	resource,
	className,
	children,
	'data-testid': dataTestId,
}) => {
	const { renderResource } = useSmartCalendarContext()

	return (
		<div
			className={cn(
				'flex items-center justify-center p-2 border-r last:border-r-0',
				className
			)}
			data-testid={dataTestId}
			style={{
				color: resource.color,
				backgroundColor: resource.backgroundColor,
			}}
		>
			{renderResource
				? renderResource(resource)
				: (children ?? (
						<div className="text-sm font-medium truncate">{resource.title}</div>
					))}
		</div>
	)
}
