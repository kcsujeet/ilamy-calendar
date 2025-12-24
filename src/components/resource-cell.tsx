import type { Resource } from '@/features/resource-calendar/types'
import { cn } from '@/lib/utils'
import { ids } from '@/lib/utils/ids'

interface ResourceCellProps {
	resource: Resource
	className?: string
	children?: React.ReactNode
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
	resource,
	className,
	children,
}) => {
	return (
		<div
			className={cn(
				'flex items-center justify-center p-2 flex-1 border-r last:border-r-0',
				className
			)}
			data-testid={ids.resourceCell(resource.id)}
			style={{
				color: resource.color,
				backgroundColor: resource.backgroundColor,
			}}
		>
			{children ?? (
				<div className="text-sm font-medium truncate">{resource.title}</div>
			)}
		</div>
	)
}
