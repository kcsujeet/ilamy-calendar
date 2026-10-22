import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'
import { installProbe } from './probe'

installProbe()

const root = document.querySelector('#root')
if (!root) {
	throw new Error('Root element #root not found')
}

// No StrictMode: it double-renders only in development and would not exist in a consumer's production build.
createRoot(root).render(<App />)
