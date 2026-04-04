import type React from 'react'
import { memo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { ResourceMonthHorizontal } from './resource-month-horizontal'
import { ResourceMonthVertical } from './resource-month-vertical'

const NoMemoResourceMonthView: React.FC = () => {
	const { orientation } = useSmartCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceMonthVertical />
	}

	return <ResourceMonthHorizontal />
}

export const ResourceMonthView = memo(NoMemoResourceMonthView)
