import type { Resource } from '@/features/resource-calendar/types'
import { cn } from '@/lib/utils'

interface ResourceCellProps {
	renderResource?: (resource: Resource) => React.ReactNode
	resource: Resource
	className?: string
	children?: React.ReactNode
	'data-testid'?: string
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
	resource,
	renderResource,
	className,
	children,
	'data-testid': dataTestId,
}) => {
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
						<div className="ext-sm font-medium truncate">{resource.title}</div>
					))}
		</div>
	)
}
