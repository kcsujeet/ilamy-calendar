import type { VerticalGridColProps } from '@/components/vertical-grid/vertical-grid-col'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import dayjs from '@/lib/configs/dayjs-config'
import { keys } from '@/lib/utils/keys'

// Reads hour slots from the time gutter column, or the first column with hours.
export const getTimeColumnHours = (
	columns: VerticalGridColProps[]
): Dayjs[] | undefined => {
	const timeColumn = columns.find((column) => column.id === keys.col.time)
	if (timeColumn?.days.length) {
		return timeColumn.days
	}

	return columns.find((column) => column.days.length > 0)?.days
}

// Picks the visible hour row closest to the current clock time.
const pickHourSlotForNow = (hours: Dayjs[], now: Dayjs) => {
	const nowMinutes = now.hour() * 60 + now.minute()
	let closest = hours[0]
	let closestDistance = Number.POSITIVE_INFINITY

	for (const hour of hours) {
		const hourMinutes = hour.hour() * 60 + hour.minute()
		const distance = Math.abs(hourMinutes - nowMinutes)
		if (distance < closestDistance) {
			closestDistance = distance
			closest = hour
		}
	}

	return closest
}

// Scrolls the time grid so the current clock time is centered in the viewport.
export const scrollToCurrentTime = (
	viewport: HTMLElement,
	hours: Dayjs[],
	now: Dayjs = dayjs()
) => {
	if (!hours.length) {
		return
	}

	const slot = pickHourSlotForNow(hours, now)
	const timeCell = viewport.querySelector<HTMLElement>(
		`[data-testid="${keys.cell.verticalTime(slot.format('HH'))}"]`
	)

	if (!timeCell) {
		return
	}

	const maxScroll = viewport.scrollHeight - viewport.clientHeight
	if (maxScroll <= 0) {
		return
	}

	const containerTop = viewport.getBoundingClientRect().top
	const cellTop = timeCell.getBoundingClientRect().top
	const cellHeight = timeCell.getBoundingClientRect().height
	const targetScrollTop =
		viewport.scrollTop +
		(cellTop - containerTop) -
		viewport.clientHeight / 2 +
		cellHeight / 2

	viewport.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))
}
