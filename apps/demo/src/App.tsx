import './index.css'
import { Playground } from '@ilamy/playground'
import { ModeToggle } from './components/mode-toggle'

export function App() {
	return (
		<div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 relative z-10">
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md"
				href="#calendar-stage"
			>
				Skip to calendar
			</a>
			<header className="flex justify-end mb-2">
				<ModeToggle />
			</header>
			<main>
				<Playground />
			</main>
		</div>
	)
}
