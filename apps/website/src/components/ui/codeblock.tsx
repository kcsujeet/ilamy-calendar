'use client'

import { Check, Clipboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BundledLanguage } from 'shiki'
import { codeToHtml } from 'shiki'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
	children: string
	lang: BundledLanguage
	height?: string
	className?: string
	theme?: string
}

export function CodeBlock({
	children,
	theme = 'github-dark-default',
	lang,
	height = '600',
	className,
}: Props) {
	const [html, setHtml] = useState<string>('')
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		const generateHtml = async () => {
			const out = await codeToHtml(children, {
				lang,
				theme,
				colorReplacements: {
					'#0d1117': 'var(--card)',
					'#ffffff': 'var(--card)',
				},
			})
			setHtml(out)
		}

		generateHtml()
	}, [children, lang, theme])

	const handleCopy = async () => {
		await navigator.clipboard.writeText(children)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	if (!html) {
		return (
			<div
				className={cn('relative rounded-md border animate-pulse', className)}
			>
				<div className="bg-muted h-8 rounded-t-md" />
				<div className="p-4 space-y-2">
					<div className="h-4 bg-muted rounded w-3/4" />
					<div className="h-4 bg-muted rounded w-1/2" />
					<div className="h-4 bg-muted rounded w-2/3" />
				</div>
			</div>
		)
	}

	return (
		<div
			className={cn(
				'relative rounded-md md:text-xl overflow-auto border shadow',
				className
			)}
			style={{ height: '100%', maxHeight: `${height}px` }}
		>
			<div className="sticky top-5 flex justify-end -mt-8 mr-5">
				<Tooltip>
					<TooltipTrigger
						className="p-1 rounded-md hover:bg-muted transition"
						onClick={handleCopy}
					>
						{copied ? <Check size={18} /> : <Clipboard size={18} />}
					</TooltipTrigger>
					<TooltipContent>
						<p>{copied ? 'Copied!' : 'Copy to Clipboard'}</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<div
				className="overflow-x-auto w-full bg-card flex [&_pre]:w-full [&_pre]:m-0"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: syntax-highlighted output from trusted Shiki at build time
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</div>
	)
}
