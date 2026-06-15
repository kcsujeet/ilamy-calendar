export function Footer() {
	return (
		<footer className="border-t border-white/10 dark:border-white/5 py-10 bg-white/60 dark:bg-black/40 backdrop-blur-lg relative overflow-hidden">
			{/* Background elements */}
			<div className="absolute inset-0 -z-10 bg-gradient-to-t from-blue-50/5 to-indigo-50/5 dark:from-blue-950/5 dark:to-indigo-950/5"></div>
			<div className="absolute bottom-0 right-0 -z-10 w-64 h-64 bg-blue-500/5 rounded-full filter blur-2xl"></div>
			<div className="absolute top-1/2 left-0 -z-10 w-72 h-72 bg-indigo-500/5 rounded-full filter blur-2xl"></div>

			<div className="container mx-auto px-4 relative">
				{/* Main footer content */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
					{/* Column 1: About */}
					<div>
						<div className="flex items-center gap-2 mb-4">
							<div className="p-1.5 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm shadow-sm">
								<img
									alt="ilamy Calendar"
									className="w-5 h-5"
									src="/ilamy.svg"
								/>
							</div>
							<span className="font-semibold text-lg">ilamy Calendar</span>
						</div>
						<p className="text-sm text-muted-foreground mb-4">
							A professional React calendar component for modern applications.
							React-first, customizable, and feature-rich.
						</p>
						<div className="flex gap-4">
							<a
								aria-label="GitHub"
								className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white/20 dark:bg-white/10 p-1.5 rounded-full backdrop-blur-sm h-10 w-10 flex items-center justify-center"
								href="https://github.com/kcsujeet/ilamy-calendar"
								rel="noopener noreferrer"
								target="_blank"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>GitHub</title>
									<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
								</svg>
							</a>
							<a
								aria-label="npm"
								className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white/20 dark:bg-white/10 p-1.5 rounded-full backdrop-blur-sm flex items-center justify-center aspect-square h-10"
								href="https://www.npmjs.com/package/@ilamy/calendar"
								rel="noopener noreferrer"
								target="_blank"
							>
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>npm</title>
									<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
								</svg>
							</a>
						</div>
					</div>

					{/* Column 2: Products */}
					<div>
						<h3 className="font-semibold mb-4 text-blue-600 dark:text-blue-400">
							Products
						</h3>
						<ul className="space-y-2">
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
									href="/docs/introduction"
								>
									Documentation
								</a>
							</li>
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
									href="/demo"
								>
									Demo
								</a>
							</li>
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
									href="/pricing"
								>
									Pricing
								</a>
							</li>
						</ul>
					</div>

					{/* Column 3: Resources */}
					<div>
						<h3 className="font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
							Resources
						</h3>
						<ul className="space-y-2">
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
									href="/docs/help/faq"
								>
									FAQ
								</a>
							</li>
						</ul>
					</div>

					{/* Column 4: Project */}
					<div>
						<h3 className="font-semibold mb-4 text-purple-600 dark:text-purple-400">
							Project
						</h3>
						<ul className="space-y-2">
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
									href="/about"
								>
									About
								</a>
							</li>
							<li>
								<a
									className="text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
									href="/support"
								>
									Support
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Divider */}
				<div className="border-t border-white/10 dark:border-white/5 py-6 backdrop-blur-md bg-white/30 dark:bg-black/20 rounded-lg mt-6 px-4">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						{/* Copyright */}
						<div className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} ilamy Calendar. All rights reserved.
						</div>

						{/* Legal links */}
						<div className="flex flex-wrap gap-6">
							<a
								className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
								href="/terms"
							>
								Terms & Conditions
							</a>
							<a
								className="text-sm text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
								href="/privacy"
							>
								Privacy Policy
							</a>
							<a
								className="text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
								href="/cookies"
							>
								Cookie Policy
							</a>
							<a
								className="text-sm text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
								href="/license"
							>
								License
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
