import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

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
