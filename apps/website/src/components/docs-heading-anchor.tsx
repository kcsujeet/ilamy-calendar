import { useEffect } from 'react'

export function DocsHeadingAnchor() {
	useEffect(() => {
		// Add copy link buttons to all section headings
		const addCopyButtons = () => {
			const sections = document.querySelectorAll('section[id]')

			sections.forEach((section) => {
				const id = section.getAttribute('id')
				if (!id) return

				// Find the first h2 or h3 heading in the section
				const heading = section.querySelector('h2, h3')
				if (!heading || heading.querySelector('.heading-anchor')) return

				// Create anchor wrapper
				const anchorWrapper = document.createElement('span')
				anchorWrapper.className =
					'heading-anchor-wrapper group relative inline-flex items-center'

				// Wrap the heading content in a clickable link
				const headingContent = heading.innerHTML
				heading.innerHTML = ''

				const headingLink = document.createElement('a')
				headingLink.href = `#${id}`
				headingLink.className = 'heading-link'
				headingLink.innerHTML = headingContent
				anchorWrapper.appendChild(headingLink)

				// Create the copy button
				const button = document.createElement('button')
				button.className =
					'heading-anchor ml-2 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors'
				button.setAttribute('aria-label', 'Copy link to section')
				button.setAttribute('data-section-id', id)
				button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `

				anchorWrapper.appendChild(button)
				heading.appendChild(anchorWrapper)
			})
		}

		addCopyButtons()

		// Handle copy button clicks
		const handleCopyClick = async (e: MouseEvent) => {
			const target = e.target as HTMLElement
			const button = target.closest('.heading-anchor') as HTMLButtonElement

			if (!button) return

			const sectionId = button.getAttribute('data-section-id')
			if (!sectionId) return

			const url = `${window.location.origin}${window.location.pathname}#${sectionId}`

			try {
				await navigator.clipboard.writeText(url)

				// Show check icon
				const copyIcon = button.querySelector('.copy-icon')
				const checkIcon = button.querySelector('.check-icon')

				if (copyIcon && checkIcon) {
					copyIcon.classList.add('hidden')
					checkIcon.classList.remove('hidden')
				}

				// Reset after 2 seconds
				setTimeout(() => {
					if (copyIcon && checkIcon) {
						copyIcon.classList.remove('hidden')
						checkIcon.classList.add('hidden')
					}
				}, 2000)
			} catch (err) {
				console.error('Failed to copy link:', err)
			}
		}

		document.addEventListener('click', handleCopyClick)

		// Handle hash changes (when clicking anchor links)
		const handleHashChange = () => {
			const hash = window.location.hash
			if (hash) {
				const id = hash.substring(1)
				const element = document.getElementById(id)
				if (element) {
					requestAnimationFrame(() => {
						element.scrollIntoView({ behavior: 'smooth', block: 'start' })
						window.scrollBy({ top: -80, behavior: 'smooth' })
					})
				}
			}
		}

		window.addEventListener('hashchange', handleHashChange)

		return () => {
			document.removeEventListener('click', handleCopyClick)
			window.removeEventListener('hashchange', handleHashChange)
		}
	}, [])

	return null
}
