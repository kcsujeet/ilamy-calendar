import './index.css'
import { Playground } from '@ilamy/playground'
import { ModeToggle } from './components/mode-toggle'

export function App() {
	return (
		<div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 relative z-10">
			<div className="flex justify-end mb-2">
				<ModeToggle />
			</div>
			<Playground />
		</div>
	)
}
