import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

const root = document.querySelector('#root')
if (!root) {
	throw new Error('Root element #root not found')
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>
)
