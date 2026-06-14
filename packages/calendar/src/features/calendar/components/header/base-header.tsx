import { Button } from '@ilamy/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs from '@ilamy/utils/dayjs'
import { ChevronLeft, ChevronRight, Download, Menu, Plus } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { downloadICalendar } from '@/lib/utils/export-ical'
import { TitleContent } from './title-content'
import { ViewControls } from './view-controls'

interface HeaderProps {
	className?: string
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
	const {
		view,
		setView,
		nextPeriod,
		prevPeriod,
		today,
		openEventForm,
		headerComponent,
		headerClassName,
		rawEvents,
		t,
		hideExportButton,
		collect,
	} = useSmartCalendarContext((ctx) => ({
		view: ctx.view,
		setView: ctx.setView,
		nextPeriod: ctx.nextPeriod,
		prevPeriod: ctx.prevPeriod,
		today: ctx.today,
		openEventForm: ctx.openEventForm,
		headerComponent: ctx.headerComponent,
		headerClassName: ctx.headerClassName,
		rawEvents: ctx.rawEvents,
		t: ctx.t,
		hideExportButton: ctx.hideExportButton,
		collect: ctx.collect,
	}))

	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	const closeMobileMenu = () => setMobileMenuOpen(false)

	// Wrap any handler so it also closes the mobile menu after firing.
	const withClose =
		<Args extends unknown[]>(fn: (...args: Args) => void) =>
		(...args: Args) => {
			fn(...args)
			closeMobileMenu()
		}

	const handleExport = () => {
		const filename = `ilamy-calendar-${dayjs().format('YYYY-MM-DD')}.ics`
		downloadICalendar(rawEvents, collect, filename, 'ilamy Calendar')
		closeMobileMenu()
	}

	const NewEventButton = () => (
		<Button
			className="flex items-center gap-1"
			onClick={() => openEventForm()}
			size="sm"
			variant="default"
		>
			<Plus className="h-4 w-4" />
			<span className="hidden @4xl:inline">{t('new')}</span>
		</Button>
	)

	const ExportButton = ({ fullWidth = false }: { fullWidth?: boolean }) => (
		<Button
			className={cn('flex items-center gap-1', fullWidth && 'w-full gap-2')}
			onClick={handleExport}
			size="sm"
			variant="outline"
		>
			<Download className="h-4 w-4" />
			{fullWidth ? (
				`${t('export')} Calendar (.ics)`
			) : (
				<span className="hidden @4xl/base-header:inline">{t('export')}</span>
			)}
		</Button>
	)

	if (headerComponent) {
		return headerComponent
	}

	return (
		<div
			className="@container/base-header w-full"
			data-testid="calendar-header"
		>
			<div
				className={cn(
					'flex justify-center @2xl/base-header:justify-between flex-wrap items-center gap-2',
					className,
					headerClassName
				)}
			>
				<div className="flex flex-wrap items-center justify-center gap-1 @2xl/base-header:justify-start">
					<Button
						className="rounded-full"
						onClick={prevPeriod}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<TitleContent />
					<Button
						className="rounded-full"
						onClick={nextPeriod}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex flex-wrap justify-start @xl/base-header:justify-center gap-1 @4xl/base-header:justify-end overflow-x-auto">
					<div className="hidden @md/base-header:flex items-center justify-start gap-1">
						<ViewControls
							className="justify-end"
							currentView={view}
							onChange={setView}
							onToday={today}
							variant="default"
						/>
						<NewEventButton />
						{!hideExportButton && <ExportButton />}
					</div>

					<div className="flex items-center justify-end gap-1 @md/base-header:hidden">
						<NewEventButton />
						<Popover onOpenChange={setMobileMenuOpen} open={mobileMenuOpen}>
							<PopoverTrigger asChild>
								<Button size="sm" variant="outline">
									<Menu className="h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-[240px] p-2">
								<div className="space-y-2">
									<ViewControls
										currentView={view}
										onChange={withClose(setView)}
										onNext={withClose(nextPeriod)}
										onPrevious={withClose(prevPeriod)}
										onToday={withClose(today)}
										variant="grid"
									/>
									{!hideExportButton && (
										<div className="pt-2 border-t">
											<ExportButton fullWidth />
										</div>
									)}
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</div>
		</div>
	)
}
