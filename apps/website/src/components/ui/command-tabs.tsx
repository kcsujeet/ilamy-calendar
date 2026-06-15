'use client'
import { Check, Clipboard, SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CommandItem {
	label: string
	command: string
}

interface CommandBlockProps {
	title?: string
	command?: string
	commands?: CommandItem[]
	defaultValue?: string
	showTerminalIcon?: boolean
	className?: string
}

function SingleCommandBlock({
	title,
	command,
	showTerminalIcon = true,
	className,
}: {
	title?: string
	command: string
	showTerminalIcon?: boolean
	className?: string
}) {
	const [copied, setCopied] = useState(false)

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy text: ', err)
		}
	}

	return (
		<div className={cn('w-full max-w-2xl', className)}>
			<div className="bg-card rounded-md border">
				{(title || showTerminalIcon) && (
					<>
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center space-x-2">
								{showTerminalIcon && (
									<SquareTerminal className="text-muted-foreground" size={20} />
								)}
								{title && (
									<span className="font-medium text-muted-foreground">
										{title}
									</span>
								)}
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className="h-8 w-8 p-0"
										onClick={() => copyToClipboard(command)}
										size="sm"
										variant="ghost"
									>
										{copied ? <Check size={18} /> : <Clipboard size={20} />}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{copied ? 'Copied!' : 'Copy to Clipboard'}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<Separator />
					</>
				)}
				<div className="p-4 font-mono bg-card overflow-x-auto">
					<p className="text-muted-foreground break-words whitespace-pre-wrap">
						{command}
					</p>
				</div>
			</div>
		</div>
	)
}

function MultiCommandBlock({
	commands,
	defaultValue,
	showTerminalIcon = true,
	className,
}: {
	commands: CommandItem[]
	defaultValue?: string
	showTerminalIcon?: boolean
	className?: string
}) {
	const [copied, setCopied] = useState(false)
	const [activeTab, setActiveTab] = useState(defaultValue || commands[0]?.label)

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy text: ', err)
		}
	}

	const activeCommand =
		commands.find((cmd) => cmd.label === activeTab)?.command || ''

	return (
		<div className={cn('w-full max-w-2xl', className)}>
			<Tabs
				className="w-full bg-card rounded-md border gap-0"
				onValueChange={setActiveTab}
				value={activeTab}
			>
				<TabsList className="flex w-full bg-card justify-between items-center px-2 py-1 my-1 rounded-t-md">
					<div className="flex items-center">
						{showTerminalIcon && (
							<SquareTerminal
								className="mx-2 text-muted-foreground"
								size={20}
							/>
						)}
						<div className="flex">
							{commands.map((tab) => (
								<TabsTrigger
									className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
									key={tab.label}
									value={tab.label}
								>
									{tab.label}
								</TabsTrigger>
							))}
						</div>
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="h-8 w-8 p-0"
								onClick={() => copyToClipboard(activeCommand)}
								size="sm"
								variant="ghost"
							>
								{copied ? <Check size={20} /> : <Clipboard size={20} />}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{copied ? 'Copied!' : 'Copy to Clipboard'}</p>
						</TooltipContent>
					</Tooltip>
				</TabsList>
				<Separator />
				{commands.map((tab) => (
					<TabsContent
						className="mt-0 p-4 font-mono bg-card rounded-b-md overflow-x-auto"
						key={tab.label}
						value={tab.label}
					>
						<p className="text-muted-foreground break-words whitespace-pre-wrap">
							{tab.command}
						</p>
					</TabsContent>
				))}
			</Tabs>
		</div>
	)
}

export function CommandBlock(props: CommandBlockProps) {
	const { command, commands, ...rest } = props

	if (command) {
		return <SingleCommandBlock command={command} {...rest} />
	}

	if (commands && commands.length > 0) {
		return <MultiCommandBlock commands={commands} {...rest} />
	}

	return null
}
