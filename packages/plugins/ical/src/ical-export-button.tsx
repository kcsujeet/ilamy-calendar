import { useCalendarComponents, useIlamyCalendarContext } from '@ilamy/calendar'
import { dayKey, now, resolveZone } from '@ilamy/utils/temporal'
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { downloadICalendar } from './export-ical'

export interface IcalExportButtonProps {
	calendarName?: string
	filenamePrefix?: string
}

/** Toolbar button contributed into `SLOT_TOOLBAR` by `icalPlugin()`. */
export const IcalExportButton = ({
	calendarName = 'ilamy Calendar',
	filenamePrefix = 'ilamy-calendar',
}: IcalExportButtonProps): ReactNode => {
	const { rawEvents, collect, timezone, t } = useIlamyCalendarContext()
	const { Button } = useCalendarComponents()

	const handleExport = () => {
		const todayDate = dayKey(now(resolveZone(timezone)))
		const filename = `${filenamePrefix}-${todayDate}.ics`
		downloadICalendar(rawEvents, collect, filename, {
			calendarName,
			timezone,
		})
	}

	return (
		<Button
			aria-label={t('export')}
			onClick={handleExport}
			size="default"
			type="button"
			variant="outline"
		>
			<Download className="size-4" />
			<span className="hidden @2xl/base-header:inline">{t('export')}</span>
		</Button>
	)
}
