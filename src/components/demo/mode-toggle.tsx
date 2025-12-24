import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Theme = 'dark' | 'light' | 'system'
const defaultTheme: Theme = 'dark'
const storageKey = 'ilamy-calendar-theme'

export function ModeToggle() {
	const [theme, setTheme] = useState<Theme>(() => defaultTheme)

	useEffect(() => {
		const saved = localStorage.getItem(storageKey) as Theme
		if (saved) {
			setTheme(saved)
		}
	}, [])

	const toggleTheme = () => {
		const root = window.document.documentElement
		const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
		root.classList.remove('light', 'dark')
		root.classList.add(nextTheme)

		localStorage.setItem(storageKey, nextTheme)
		setTheme(nextTheme)
	}

	// Determine the icon to display based on current theme
	const getThemeIcon = () => {
		switch (theme) {
			case 'light':
				return <Sun className="h-4 w-4 transition-all text-amber-500" />
			case 'dark':
				return <Moon className="h-4 w-4 transition-all text-indigo-400" />
			default:
				return <Sun className="h-4 w-4 transition-all text-amber-500" />
		}
	}

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
