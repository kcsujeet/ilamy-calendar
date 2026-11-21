import { Button } from '@ilamy/ui/components/button'
import { Card, CardContent, CardHeader } from '@ilamy/ui/components/card'
import { cn } from '@ilamy/ui/lib/utils'
import { Check, Code2, Copy, Terminal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
	defaultSettings,
	type PlaygroundSettings,
} from '../../../types/settings-form.types'
import {
	FRAMEWORK_CODE_TAB_LABELS,
	generateCodeSnippet,
} from '../utils/code-snippet.utils'

const COPIED_RESET_DELAY_MS = 1800

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

function CopyCodeButton({
	copied,
	onCopy,
}: {
	copied: boolean
	onCopy: () => void
}) {
	if (copied) {
		return (
			<Button onClick={onCopy} size="sm" type="button" variant="outline">
				<Check aria-hidden="true" className="size-3.5 mr-1 text-emerald-500" />
				Copied
			</Button>
		)
	}
	return (
		<Button onClick={onCopy} size="sm" type="button" variant="outline">
			<Copy aria-hidden="true" className="size-3.5 mr-1" />
			Copy Code
		</Button>
	)
}

function ActivityLogList({ logs }: { logs: ActivityLogEntry[] }) {
	if (logs.length === 0) {
		return (
			<div className="p-6 text-center text-xs text-muted-foreground">
				Drag, resize, create, or navigate dates in the calendar above to inspect
				live v4.0 ISO 8601 callback payloads.
			</div>
		)
	}

	return (
		<div className="max-h-72 overflow-y-auto divide-y">
			{logs.map((entry) => (
				<div className="px-4 py-2.5 text-xs space-y-1" key={entry.id}>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px]">
							{entry.kind}
						</span>
						<span className="font-medium text-foreground">{entry.summary}</span>
						<span className="ml-auto font-mono text-[10px] text-muted-foreground">
							{entry.time}
						</span>
					</div>
					<pre className="font-mono text-[11px] text-muted-foreground overflow-x-auto">
						{entry.payload}
					</pre>
				</div>
			))}
		</div>
	)
}

export function CodeAndLogPanel({ logs, onClearLogs }: CodeAndLogPanelProps) {
	const [activeTab, setActiveTab] = useState<'code' | 'events'>('code')
	const [copied, setCopied] = useState(false)
	const { control } = useFormContext<PlaygroundSettings>()
	const watched = useWatch({ control })
	const values: PlaygroundSettings = { ...defaultSettings, ...watched }
	const snippet = generateCodeSnippet(values)
	const isCodeTab = activeTab === 'code'

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(snippet)
			setCopied(true)
			setTimeout(() => setCopied(false), COPIED_RESET_DELAY_MS)
		} catch {
			setCopied(false)
		}
	}

	let headerAction = (
		<Button
			disabled={logs.length === 0}
			onClick={onClearLogs}
			size="sm"
			type="button"
			variant="ghost"
		>
			<Trash2 aria-hidden="true" className="size-3.5 mr-1" />
			Clear
		</Button>
	)
	if (isCodeTab) {
		headerAction = <CopyCodeButton copied={copied} onCopy={handleCopy} />
	}

	let tabBody = <ActivityLogList logs={logs} />
	if (isCodeTab) {
		tabBody = (
			<pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto bg-muted/30 max-h-72">
				<code>{snippet}</code>
			</pre>
		)
	}

	const activeTabClass =
		'text-foreground after:content-[""] after:absolute after:inset-x-1 after:bottom-0 after:border-b-2 after:border-primary'
	const inactiveTabClass = 'text-muted-foreground hover:text-foreground'
	let codeTabTone = inactiveTabClass
	let eventsTabTone = activeTabClass
	if (isCodeTab) {
		codeTabTone = activeTabClass
		eventsTabTone = inactiveTabClass
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
						aria-selected={isCodeTab}
						className={cn(
							'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors',
							codeTabTone
						)}
						onClick={() => setActiveTab('code')}
						role="tab"
						type="button"
					>
						<Code2 aria-hidden="true" className="size-3.5" />
						{FRAMEWORK_CODE_TAB_LABELS[values.framework]}
					</button>
					<button
						aria-selected={!isCodeTab}
						className={cn(
							'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors',
							eventsTabTone
						)}
						onClick={() => setActiveTab('events')}
						role="tab"
						type="button"
					>
						<Terminal aria-hidden="true" className="size-3.5" />
						Callback Log
						<span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0 text-[10px] font-mono text-secondary-foreground">
							{logs.length}
						</span>
					</button>
				</div>

				{headerAction}
			</CardHeader>

			<CardContent className="p-0">{tabBody}</CardContent>
		</Card>
	)
}
