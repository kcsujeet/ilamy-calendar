import { Calendar as CalendarIcon, Download, Menu, Plus } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { downloadICalendar } from '@/lib/utils/export-ical'
import TitleContent from './title-content'
import ViewControls from './view-controls'

interface HeaderProps {
	className?: string
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
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
	}))

	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	const closeMobileMenu = () => setMobileMenuOpen(false)

	const handleExport = () => {
		const filename = `ilamy-calendar-${new Date().toISOString().split('T')[0]}.ics`
		downloadICalendar(rawEvents, filename, 'ilamy Calendar')
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
					<CalendarIcon className="h-5 w-5" />
					<TitleContent />
				</div>

				<div className="flex flex-wrap justify-start @xl/base-header:justify-center gap-1 @4xl/base-header:justify-end overflow-x-auto">
					<div className="hidden @md/base-header:flex items-center justify-start gap-1">
						<ViewControls
							className="justify-end"
							currentView={view}
							onChange={setView}
							onNext={nextPeriod}
							onPrevious={prevPeriod}
							onToday={today}
							variant="default"
						/>
						<NewEventButton />
						<ExportButton />
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
										onChange={(v) => {
											setView(v)
											closeMobileMenu()
										}}
										onNext={() => {
											nextPeriod()
											closeMobileMenu()
										}}
										onPrevious={() => {
											prevPeriod()
											closeMobileMenu()
										}}
										onToday={() => {
											today()
											closeMobileMenu()
										}}
										variant="grid"
									/>
									<div className="pt-2 border-t">
										<ExportButton fullWidth />
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Header
