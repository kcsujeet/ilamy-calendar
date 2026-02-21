import type React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { ResourceWeekHorizontal } from './resource-week-horizontal'
import { ResourceWeekVertical } from './resource-week-vertical'

export const ResourceWeekView: React.FC = () => {
	const { orientation } = useSmartCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceWeekVertical />
	}

	return <ResourceWeekHorizontal />
}
