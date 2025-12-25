import type React from 'react'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import { ResourceMonthHorizontal } from './resource-month-horizontal'
import { ResourceMonthVertical } from './resource-month-vertical'

export const ResourceMonthView: React.FC = () => {
	const { orientation } = useResourceCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceMonthVertical />
	}

	return <ResourceMonthHorizontal />
}
