import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { composePluginProviders } from './compose-plugin-providers'

describe('composePluginProviders', () => {
	it('returns the children unchanged when there are no providers', () => {
		const children = <span data-testid="leaf">leaf</span>
		const result = composePluginProviders([], children)
		expect(result).toBe(children)
	})

	it('wraps providers outermost-first', () => {
		const Outer: ComponentType<{ children: ReactNode }> = ({ children }) => (
			<div data-testid="outer">{children}</div>
		)
		const Inner: ComponentType<{ children: ReactNode }> = ({ children }) => (
			<div data-testid="inner">{children}</div>
		)

		const tree = composePluginProviders(
			[Outer, Inner],
			<span data-testid="leaf">leaf</span>
		)
		const { getByTestId } = render(<>{tree}</>)

		const outer = getByTestId('outer')
		const inner = getByTestId('inner')
		const leaf = getByTestId('leaf')

		// First provider is outermost; it contains the second, which contains the leaf.
		expect(outer).toContainElement(inner)
		expect(inner).toContainElement(leaf)
	})
})
