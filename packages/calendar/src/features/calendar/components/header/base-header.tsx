import { Button } from '@ilamy/ui/components/button'
import { cn } from '@ilamy/ui/lib/utils'
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import type React from 'react'
import { useExportCalendar } from '@/features/calendar/hooks/use-export-calendar'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { HeaderDatePicker } from './header-date-picker'
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

	// Container queries drive both the control variants and the row/stack decision.
	// The row vs. two-row layout is keyed to the container width (@xl), NOT to
	// flex-wrap: wrapping would key off content width, so the date title changing
	// per view (e.g. "Jun 2026" vs "Jun 28 - Jul 4") could flip a fixed-width
	// container between one and two rows. No JS measurement needed.
	//
	// Each breakpoint sits where its row measurably fits (#298), with the day
	// view's title, the longest, in English and German: the compact row needs
	// ~562px (@xl, 576px); with Export/New labels ~651px (@2xl, 672px); with the
	// segmented switcher ~770px (@4xl, 896px). Earlier breakpoints let the
	// navigation cluster spill under, or wrap beside, the actions.
	return (
		<div
			className={cn('@container/base-header w-full', headerClassName)}
			data-testid="calendar-header"
		>
			<div
				className={cn(
					// Below @xl (phones): stack the two clusters, each centered on its
					// own line. At @xl and up the compact row fits: lay out in a single
					// row and spread to the edges.
					'flex flex-col items-center gap-2 @xl/base-header:flex-row @xl/base-header:justify-between',
					className
				)}
			>
				{/* In the stacked layout, wraps only when it cannot fit: on a narrow
				    phone the day view's long label (or a longer locale's) would
				    otherwise push the outer buttons past both edges (#298). */}
				<div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
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
					{/* Segmented switcher once it fits (@4xl); compact dropdown below. */}
					<ViewSwitcher className="hidden @4xl/base-header:flex" />
					<ViewMenu className="@4xl/base-header:hidden" />

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
