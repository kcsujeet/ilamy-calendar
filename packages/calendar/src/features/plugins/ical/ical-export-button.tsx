/** @jsxImportSource preact */
import type { PluginToolbarContext } from '@ilamy/calendar'
import { DownloadIcon } from '../../../lib/renderer/components/icons'
import { buildSlotProps } from '../../../lib/renderer/utils/slot-props.utils'
import { dayKey, now, resolveZone } from '../../../utils/temporal'
import { downloadICalendar } from './export-ical'

interface IcalExportButtonProps {
	context: PluginToolbarContext
	calendarName?: string
	filenamePrefix?: string
}

/** Toolbar button contributed into `SLOT_TOOLBAR` by `icalPlugin()`. */
export const IcalExportButton = ({
	context,
	calendarName = 'ilamy Calendar',
	filenamePrefix = 'ilamy-calendar',
}: IcalExportButtonProps) => {
	const buttonSlot = context.ownerState
		? buildSlotProps(context.slotProps, 'navButton', context.ownerState)
		: { className: undefined, style: undefined }

	const handleExport = () => {
		const todayDate = dayKey(now(resolveZone(context.timezone)))
		const filename = `${filenamePrefix}-${todayDate}.ics`
		downloadICalendar(context.events, context.collect, filename, {
			calendarName,
			timezone: context.timezone,
		})
	}

	return (
		<button
			aria-label={context.t('export')}
			className={buttonSlot.className}
			data-ilamy-slot="nav-button"
			data-testid="export-ical-btn"
			onClick={handleExport}
			style={buttonSlot.style}
			type="button"
		>
			<DownloadIcon size={16} />
			<span data-ilamy-part="export-btn-label">{context.t('export')}</span>
		</button>
	)
}
