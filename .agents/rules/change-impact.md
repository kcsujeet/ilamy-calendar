# Change impact: be skeptical of your own edits

Every change is a hypothesis until you have checked what depends on it. Passing tests are not that check: they only prove nothing *covered* broke.

## Before you edit

- **Name what you are changing.** Not the file, the *meaning*: "an event's `end` becomes exclusive", "an all-day end is stored as the next midnight", "a day cell reports its range to the next midnight". A change with no statable meaning is not ready to make.
- **Find the dependents first.** Grep for the meaning, not the symbol. If you are changing a boundary rule, sweep for every comparison against that boundary; if you are changing a stored shape, sweep for every reader of that shape. Do this *before* the edit, so the list is not filtered by what you already broke.
- **Read the file's own documentation.** `docs/` and the doc comment above the function often state the contract you are about to change. Changing code whose doc you have not read is how a repo ends up with docs that lie.
- **Check whether coverage exists at all.** If flipping the behavior leaves every test passing, the behavior was never pinned. Write the pinning tests first, then make the change and watch them move.

## After you edit, hunt the repercussions

Work outward from the change, and look for these specific shapes. Each has bitten this repo:

- **Siblings in the same function.** A value derived from the thing you changed, computed a few lines away from the same input. (`computeColumnSpan` resolved its span from an adjusted end while `isTruncatedEnd` still read the raw one.)
- **Duplicated logic that never went through the shared helper.** Fixing `eventOverlapsRange` did nothing for the agenda plugin's own `appearsOnDay`, or for the recurrence plugin's own range filter. Grep for the *predicate*, not the function name.
- **Compensating hacks that exist because of the old behavior.** Search for snaps, clamps and `-1`/`+1` adjustments near what you changed; they were written to paper over the thing you just fixed and now push the other way. (A drag snapped a midnight end back to `23:59:59.999`, resizing the event on every drag.)
- **Tests that pin the old contract.** Update them deliberately, one at a time, with a comment saying why the contract moved. Never weaken an assertion to make it pass, and never delete one to get green.
- **Tests that still pass for the wrong reason.** A test whose fixture happens to dodge the change is not coverage. Ask what it would take for it to fail.
- **Comments, docs and examples.** They encode the old semantics as surely as code does, and nothing fails when they go stale.

## Prove it, do not assert it

- **Reproduce through the real entry point.** Hand-constructed inputs are always clean and hide the bug. Drive the actual form, the actual component, the actual public API. A bug that only appears through the UI will never show up in a unit fixture you wrote yourself.
- **Verify a fix by reverting it.** Put the old line back and watch the new test fail. If it still passes, the test does not cover the fix.
- **Verify a claim about behavior by measuring it**, in this codebase, at the version in question, before writing it in a comment, a PR or an issue.

## Do not change what is not load-bearing

If you cannot name the failure a change prevents, do not make it. "Symmetry" and "consistency" are not reasons on their own: a redundant edit is still a behavior change, still needs review, and can quietly alter an edge case nobody asked about. When a check looks pointless, work out what it protects before removing it; when it is genuinely a tautology, say so and remove it with a test that proves the difference.

## Why

The expensive failures in this repo have not been wrong logic. They have been correct logic applied in one place while three other places kept the old assumption: a grid that disagreed with the agenda, an export that disagreed with the form, a drag that undid what the form stored. Those are only findable by asking "what else believed the old thing?" and answering it with a sweep, not by asking "do the tests pass?"
