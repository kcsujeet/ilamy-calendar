import { Button } from '@ilamy/ui/components/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const storageKey = 'ilamy-calendar-theme'

const readInitialTheme = (): Theme => {
	if (typeof window === 'undefined') return 'light'
	const saved = localStorage.getItem(storageKey)
	if (saved === 'dark' || saved === 'light') return saved
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ModeToggle() {
	const [theme, setTheme] = useState<Theme>(readInitialTheme)

	useEffect(() => {
		const root = window.document.documentElement
		root.classList.remove('light', 'dark')
		root.classList.add(theme)
	}, [theme])

	const toggleTheme = () => {
		const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
		localStorage.setItem(storageKey, nextTheme)
		setTheme(nextTheme)
	}

	const getThemeIcon = () =>
		theme === 'dark' ? (
			<Sun className="h-4 w-4 transition-all text-amber-500" />
		) : (
			<Moon className="h-4 w-4 transition-all text-indigo-400" />
		)

	return (
		<Button
			aria-label="Toggle theme"
			className="bg-white/20 dark:bg-white/10 border-white/20 dark:border-white/10 backdrop-blur-sm hover:bg-white/30 dark:hover:bg-white/20 p-1.5 rounded-full h-auto w-auto"
			onClick={toggleTheme}
			size="icon"
			variant="outline"
		>
			{getThemeIcon()}
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}
