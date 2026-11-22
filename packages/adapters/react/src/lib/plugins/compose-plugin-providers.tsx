import type { ComponentType, ReactNode } from 'react'

/**
 * Wraps `children` in the given plugin providers, outermost-first: the first
 * provider in the array becomes the outermost element in the tree. Each wrap is
 * keyed by index. Returns `children` unchanged when there are no providers.
 */
export const composePluginProviders = (
	providers: Array<ComponentType<{ children: ReactNode }>>,
	children: ReactNode
): ReactNode =>
	providers.reduceRight(
		(tree, PluginProvider, index) => (
			<PluginProvider key={index}>{tree}</PluginProvider>
		),
		children
	)
