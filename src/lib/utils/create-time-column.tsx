import type { Dayjs } from '@/lib/configs/dayjs-config'
import { TIME_COLUMN, TIME_COLUMN_CELL } from '@/lib/constants'
import type { TimeFormat } from '@/types'

export const createTimeColumn = (hours: Dayjs[], timeFormat: TimeFormat) => ({
	id: 'time-col',
	days: hours,
	day: undefined,
	className: TIME_COLUMN,
	gridType: 'hour' as const,
	noEvents: true,
	renderCell: (date: Dayjs) => (
		<div className={TIME_COLUMN_CELL}>
			{date.format(timeFormat === '12-hour' ? 'h A' : 'H')}
		</div>
	),
})
