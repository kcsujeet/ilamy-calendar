import { Button } from '@ilamy/ui/components/button'
import { Card, CardContent, CardHeader } from '@ilamy/ui/components/card'
import { cn } from '@ilamy/ui/lib/utils'
import { Check, Code2, Copy, Terminal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
	defaultSettings,
	type PlaygroundSettings,
} from '../types/settings-form'
import {
	FRAMEWORK_CODE_TAB_LABELS,
	generateCodeSnippet,
} from '../utils/generate-code-snippet'

export interface ActivityLogEntry {
	id: string
	time: string
	kind: string
	summary: string
	payload: string
}

interface CodeAndLogPanelProps {
	logs: ActivityLogEntry[]
	onClearLogs: () => void
}

export function CodeAndLogPanel({ logs, onClearLogs }: CodeAndLogPanelProps) {
	const [activeTab, setActiveTab] = useState<'code' | 'events'>('code')
	const [copied, setCopied] = useState(false)
	const { control } = useFormContext<PlaygroundSettings>()
	const watched = useWatch({ control })
	const values: PlaygroundSettings = { ...defaultSettings, ...watched }
	const snippet = generateCodeSnippet(values)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(snippet)
			setCopied(true)
			setTimeout(() => setCopied(false), 1800)
		} catch {
			setCopied(false)
		}
	}

	return (
		<Card className="mt-4 border bg-card/95 shadow-sm overflow-clip gap-0">
			<CardHeader className="px-3 py-2 border-b flex flex-row items-center justify-between gap-2">
				<div
					aria-label="Developer inspector"
					className="flex items-center gap-1"
					role="tablist"
				>
					<button
						aria-selected={activeTab === 'code'}
						className={cn(
							'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors',
							activeTab === 'code'
								? 'text-foreground after:content-[""] after:absolute after:inset-x-1 after:bottom-0 after:border-b-2 after:border-primary'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onClick={() => setActiveTab('code')}
						role="tab"
						type="button"
					>
						<Code2 className="size-3.5" />
						{FRAMEWORK_CODE_TAB_LABELS[values.framework]}
					</button>
					<button
						aria-selected={activeTab === 'events'}
						className={cn(
							'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors',
							activeTab === 'events'
								? 'text-foreground after:content-[""] after:absolute after:inset-x-1 after:bottom-0 after:border-b-2 after:border-primary'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onClick={() => setActiveTab('events')}
						role="tab"
						type="button"
					>
						<Terminal className="size-3.5" />
						Callback Log
						<span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0 text-[10px] font-mono text-secondary-foreground">
							{logs.length}
						</span>
					</button>
				</div>

				{activeTab === 'code' ? (
					<Button
						onClick={handleCopy}
						size="sm"
						type="button"
						variant="outline"
					>
						{copied ? (
							<>
								<Check className="size-3.5 mr-1 text-emerald-500" />
								Copied
							</>
						) : (
							<>
								<Copy className="size-3.5 mr-1" />
								Copy Code
							</>
						)}
					</Button>
				) : (
					<Button
						disabled={logs.length === 0}
						onClick={onClearLogs}
						size="sm"
						type="button"
						variant="ghost"
					>
						<Trash2 className="size-3.5 mr-1" />
						Clear
					</Button>
				)}
			</CardHeader>

			<CardContent className="p-0">
				{activeTab === 'code' ? (
					<pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto bg-muted/30 max-h-72">
						<code>{snippet}</code>
					</pre>
				) : (
					<div className="max-h-72 overflow-y-auto divide-y">
						{logs.length === 0 ? (
							<div className="p-6 text-center text-xs text-muted-foreground">
								Drag, resize, create, or navigate dates in the calendar above to
								inspect live v4.0 ISO 8601 callback payloads.
							</div>
						) : (
							logs.map((entry) => (
								<div className="px-4 py-2.5 text-xs space-y-1" key={entry.id}>
									<div className="flex items-center gap-2">
										<span className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px]">
											{entry.kind}
										</span>
										<span className="font-medium text-foreground">
											{entry.summary}
										</span>
										<span className="ml-auto font-mono text-[10px] text-muted-foreground">
											{entry.time}
										</span>
									</div>
									<pre className="font-mono text-[11px] text-muted-foreground overflow-x-auto">
										{entry.payload}
									</pre>
								</div>
							))
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
