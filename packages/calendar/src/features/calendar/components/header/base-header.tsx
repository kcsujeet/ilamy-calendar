import { Button } from '@ilamy/ui/components/button'
import { cn } from '@ilamy/ui/lib/utils'
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { HeaderDatePicker } from './header-date-picker'
import { useExportCalendar } from './use-export-calendar'
import { ViewMenu } from './view-menu'
import { ViewSwitcher } from './view-switcher'

interface HeaderProps {
	className?: string
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
	const {
		nextPeriod,
		prevPeriod,
		today,
		openEventForm,
		headerComponent,
		headerClassName,
		t,
		hideExportButton,
	} = useSmartCalendarContext((ctx) => ({
		nextPeriod: ctx.nextPeriod,
		prevPeriod: ctx.prevPeriod,
		today: ctx.today,
		openEventForm: ctx.openEventForm,
		headerComponent: ctx.headerComponent,
		headerClassName: ctx.headerClassName,
		t: ctx.t,
		hideExportButton: ctx.hideExportButton,
	}))
	const exportCalendar = useExportCalendar()

	if (headerComponent) {
		return headerComponent
	}

	// Container queries drive the control variants; `flex-wrap` keeps everything on
	// one row whenever it fits and lets it spill onto a second row only when the
	// container is too narrow (small/mobile widths). No JS measurement needed.
	return (
		<div
			className={cn('@container/base-header w-full', headerClassName)}
			data-testid="calendar-header"
		>
			<div
				className={cn(
					// Wrapped (phones, below ~@lg) each cluster is alone on its line:
					// center it. Once the compact row fits (@lg) spread to the edges.
					'flex flex-wrap items-center justify-center gap-2 @lg/base-header:justify-between',
					className
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<div className="bg-background flex h-9 items-center rounded-lg border">
						<Button
							aria-label={t('previous')}
							className="h-full"
							onClick={prevPeriod}
							size="icon"
							variant="ghost"
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							aria-label={t('next')}
							className="h-full"
							onClick={nextPeriod}
							size="icon"
							variant="ghost"
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<Button onClick={today} size="default" variant="outline">
						{t('today')}
					</Button>
					<HeaderDatePicker />
				</div>

				<div className="flex items-center gap-2">
					{/* Segmented switcher once it fits (~@3xl); compact dropdown below. */}
					<ViewSwitcher className="hidden @3xl/base-header:flex" />
					<ViewMenu className="@3xl/base-header:hidden" />

					{/* Export + New show a label when there's room, icon-only when narrow. */}
					{!hideExportButton && (
						<Button
							aria-label={t('export')}
							onClick={exportCalendar}
							size="default"
							variant="outline"
						>
							<Download className="size-4" />
							<span className="hidden @2xl/base-header:inline">
								{t('export')}
							</span>
						</Button>
					)}
					<Button
						aria-label={t('new')}
						onClick={() => openEventForm()}
						size="default"
					>
						<Plus className="size-4" />
						<span className="hidden @2xl/base-header:inline">{t('new')}</span>
					</Button>
				</div>
			</div>
		</div>
	)
}
