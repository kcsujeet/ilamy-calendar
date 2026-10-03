import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { createContext, type ReactNode } from 'react'
import { useRequiredContext } from './use-required-context'

const NameContext = createContext<string | undefined>(undefined)

/** The context value `useRequiredContext` returns, rendered with `value` provided or not. */
const readNameContext = (value?: string) => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<NameContext.Provider value={value}>{children}</NameContext.Provider>
	)
	const { result } = renderHook(
		() => useRequiredContext(NameContext, 'useName', 'NameProvider'),
		{ wrapper }
	)
	return result.current
}

describe('useRequiredContext', () => {
	it('returns the provided value', () => {
		expect(readNameContext('Room A')).toBe('Room A')
	})

	it('throws naming the hook and its provider when there is none', () => {
		expect(() => readNameContext()).toThrow(
			'useName must be used within a NameProvider'
		)
	})
})
