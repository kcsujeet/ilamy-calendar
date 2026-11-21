import { cn } from '@ilamy/ui/lib/utils'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type React from 'react'
import { ToolbarSlot } from '@/components/calendar-slots'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import {
	useCalendarComponents,
	useCalendarTheme,
	useSlotProps,
} from '@/stores/calendar-theme-context'
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
	} = useSmartCalendarContext((ctx) => ({
		nextPeriod: ctx.nextPeriod,
		prevPeriod: ctx.prevPeriod,
		today: ctx.today,
		openEventForm: ctx.openEventForm,
		headerComponent: ctx.headerComponent,
		headerClassName: ctx.headerClassName,
		t: ctx.t,
	}))
	const { Button } = useCalendarComponents()
	const { unstyled } = useCalendarTheme()
	const headerSlot = useSlotProps('header', {
		structuralClassName: '@container/base-header w-full',
		extraClassName: headerClassName,
	})
	const toolbarSlot = useSlotProps('toolbar', {
		structuralClassName:
			'flex flex-col items-center gap-2 @xl/base-header:flex-row @xl/base-header:justify-between',
		extraClassName: className,
	})
	const navButtonSlot = useSlotProps('navButton', {
		structuralClassName: 'h-full',
	})
	let groupedArrowStyle: React.CSSProperties | undefined
	if (navButtonSlot.style) {
		groupedArrowStyle = {
			...navButtonSlot.style,
			border: 'none',
			borderRadius: 0,
		}
	}

	if (headerComponent) {
		return headerComponent
	}

	return (
		<div
			className={headerSlot.className}
			data-testid="calendar-header"
			style={headerSlot.style}
		>
			<div className={toolbarSlot.className} style={toolbarSlot.style}>
				<div className="flex min-w-0 flex-wrap @xl/base-header:flex-nowrap items-center justify-center gap-2">
					<div
						className={cn(
							'flex shrink-0 items-center',
							!unstyled && 'bg-background h-9 overflow-hidden rounded-lg border'
						)}
					>
						<Button
							aria-label={t('previous')}
							className={navButtonSlot.className}
							onClick={prevPeriod}
							size="icon"
							style={groupedArrowStyle}
							type="button"
							variant="ghost"
						>
							<ChevronLeft aria-hidden="true" className="size-4" />
						</Button>
						<Button
							aria-label={t('next')}
							className={navButtonSlot.className}
							onClick={nextPeriod}
							size="icon"
							style={groupedArrowStyle}
							type="button"
							variant="ghost"
						>
							<ChevronRight aria-hidden="true" className="size-4" />
						</Button>
					</div>
					<Button
						onClick={today}
						size="default"
						type="button"
						variant="outline"
					>
						{t('today')}
					</Button>
					<HeaderDatePicker />
				</div>

				<div className="flex items-center gap-2">
					{/* Segmented switcher once it fits (@4xl); compact dropdown below. */}
					<ViewSwitcher className="hidden @4xl/base-header:flex" />
					<ViewMenu className="@4xl/base-header:hidden" />

					{/* Plugin-contributed toolbar actions (e.g. @ilamy/calendar/plugins/ical). */}
					<ToolbarSlot placement="desktop" />

					<Button
						aria-label={t('new')}
						onClick={() => openEventForm()}
						size="default"
						type="button"
					>
						<Plus aria-hidden="true" className="size-4" />
						<span className="hidden @2xl/base-header:inline">{t('new')}</span>
					</Button>
				</div>
			</div>
		</div>
	)
}
