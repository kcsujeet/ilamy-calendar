import './index.css'
import { Playground } from '@ilamy/playground'
import { ModeToggle } from './components/mode-toggle'

export function App() {
	return (
		<div className="container mx-auto p-8 relative z-10">
			<div className="flex justify-end mb-4">
				<ModeToggle />
			</div>
			<Playground />
		</div>
	)
}
