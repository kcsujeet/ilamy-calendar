import { Card, CardContent } from '@/components/ui/card'

export function FeatureCard({
	icon,
	title,
	description,
}: {
	icon?: React.ReactNode
	title: string
	description: string
}) {
	return (
		<Card className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border-white/20 dark:border-white/15 shadow-md hover:shadow-lg transition-all">
			<CardContent className="pt-6">
				<div className="mb-5">{icon}</div>
				<h3 className="text-xl font-semibold mb-3">{title}</h3>
				<p className="text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	)
}
