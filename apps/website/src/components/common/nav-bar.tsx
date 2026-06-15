import { MenuIcon } from 'lucide-react'
import type React from 'react'
import { GithubIcon } from '@/components/icons/github-icon'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface HeaderProps {
	pathname: string
	children?: React.ReactNode
}

export function Header({ pathname, children }: HeaderProps) {
	return (
		<>
			{/* Header */}
			<header className="sticky top-0 z-50 border-b border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
				<div className="container mx-auto px-4 py-3 flex justify-between items-center">
					<div className="flex items-center gap-2">
						<img alt="ilamy Calendar" className="w-8 h-8" src="/ilamy.svg" />
						<a
							className="text-xl font-bold tracking-tight hover:text-primary transition-colors"
							href="/"
						>
							ilamy Calendar
						</a>
					</div>
					<nav className="hidden md:flex items-center gap-6">
						<a
							className={`font-medium relative hover:text-primary transition-colors after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100 ${
								pathname === '/' ? 'font-semibold after:scale-x-100' : ''
							}`}
							href="/"
						>
							Home
						</a>
						<a
							className={`font-medium relative hover:text-primary transition-colors after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100 ${
								pathname.startsWith('/demo')
									? 'font-semibold after:scale-x-100'
									: ''
							}`}
							href="/demo"
						>
							Demo
						</a>
						<a
							className={`font-medium relative hover:text-primary transition-colors after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100 ${
								pathname.startsWith('/docs')
									? 'font-semibold after:scale-x-100'
									: ''
							}`}
							href="/docs/introduction"
						>
							Documentation
						</a>
					</nav>
					<div className="flex items-center gap-4">
						{/* Desktop GitHub link */}
						<a
							className="hidden md:block text-muted-foreground hover:text-foreground transition-colors"
							href="https://github.com/kcsujeet/ilamy-calendar"
							rel="noopener noreferrer"
							target="_blank"
						>
							<GithubIcon className="w-5 h-5" />
						</a>
						<a
							aria-label="npm"
							className="hidden md:block text-muted-foreground hover:text-foreground transition-colors"
							href="https://www.npmjs.com/package/@ilamy/calendar"
							rel="noopener noreferrer"
							target="_blank"
						>
							{/* NPM icon */}
							<svg
								aria-hidden="true"
								className="w-5 h-5"
								fill="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
							</svg>
						</a>
						{children}

						{/* Mobile menu */}
						<Sheet>
							<SheetTrigger asChild className="md:hidden">
								<button
									className="p-2 hover:bg-accent rounded-md"
									type="button"
								>
									<MenuIcon className="w-5 h-5" />
									<span className="sr-only">Open menu</span>
								</button>
							</SheetTrigger>
							<SheetContent className="w-[300px]" side="right">
								<div className="flex flex-col space-y-4 mt-8">
									<a
										className={`px-4 py-2 text-lg font-medium rounded-md transition-colors hover:bg-accent ${
											pathname === '/' ? 'text-primary bg-primary/10' : ''
										}`}
										href="/"
									>
										Home
									</a>
									<a
										className={`px-4 py-2 text-lg font-medium rounded-md transition-colors hover:bg-accent ${
											pathname === '/demo' ? 'text-primary bg-primary/10' : ''
										}`}
										href="/demo"
									>
										Demo
									</a>
									<a
										className={`px-4 py-2 text-lg font-medium rounded-md transition-colors hover:bg-accent ${
											pathname.startsWith('/docs')
												? 'text-primary bg-primary/10'
												: ''
										}`}
										href="/docs/introduction"
									>
										Documentation
									</a>
									<div className="border-t pt-4 mt-4">
										<a
											className="flex items-center gap-2 px-4 py-2 text-lg font-medium rounded-md transition-colors hover:bg-accent"
											href="https://github.com/kcsujeet/ilamy-calendar"
											rel="noopener noreferrer"
											target="_blank"
										>
											<GithubIcon className="w-5 h-5" />
											GitHub
										</a>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</header>
		</>
	)
}
