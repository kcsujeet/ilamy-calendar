import type React from 'react'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import { ResourceWeekHorizontal } from './resource-week-horizontal'
import { ResourceWeekVertical } from './resource-week-vertical'

export const ResourceWeekView: React.FC = () => {
	const { orientation } = useResourceCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceWeekVertical />
	}

	return <ResourceWeekHorizontal />
}
