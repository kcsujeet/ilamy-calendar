---
name: code-refactor-review
description: Reviews code changes for reuse, composition, codebase consistency, and slop. Use when asked to review PRs/diffs, check code reuse, composition, cleanliness, or whether code fits the codebase.
---

# Code Refactor Review

Review code changes the way Sahaj usually asks for review: go deep on reuse, composition, codebase consistency, and anything that reads like slop.

## First Pass

1. Inspect the full diff:
   - Use `git diff` for unstaged changes.
   - Use `git diff HEAD` if there are staged changes.
   - For a PR URL, inspect the changed files and understand the feature flow before reviewing details.
2. Build the call stack / data flow when useful. Do not review isolated lines without understanding how the feature is wired.
3. Search the codebase before judging new helpers, components, hooks, or patterns. Prefer nearby and sibling patterns over invented abstractions.

## Review Lenses

### 1. Reuse Existing Code

- Look for existing utilities, components, hooks, server actions, route patterns, copy patterns, and styling primitives before accepting newly written code.
- Flag duplicated logic, copied helpers, or custom implementations of things the codebase already has.
- Prefer reusing the existing flow even if it needs a small extension.
- If the new code creates a shared helper, verify it has real reuse and is not just extracted private logic with a vague name.

### 2. Codebase Consistency

- File placement should match the domain and neighboring features. Be suspicious of random top-level `lib` dumps.
- Naming should match what the code actually does and follow sibling file/function names.
- Avoid implementation details in names unless they are the actual product/API distinction.
- Use existing result/error/loading patterns. Do not invent bespoke success/failure types when the codebase has a standard one.
- Match existing copy and tone for user-facing text.

### 3. Composition and Boundaries

- Functions should do one thing at the right level of abstraction.
- Avoid grab-bag modules that mix unrelated concerns like flags, API calls, transformation, UI state, logging, and scheduling.
- Avoid parameter sprawl. If a function needs many knobs, check whether the boundary is wrong.
- Prefer simple composition over chains of callbacks, wrappers, memoized helpers, and prop plumbing.
- When two backing entities are presented as one product concept, package them into one transport/view model across intermediate components. Black-box components should receive one unified prop/callback and should not care about distinctions like remote vs prebuilt; split back into core entities only at roots/adapters where persistence or payload formats require it.
- Keep domain-specific logic close to its domain unless there is proven cross-domain reuse.

### 4. Slop Detection

Flag and, when asked, remove:

- **Comment slop**: obvious comments, comments defending awkward code, long comments that should become clearer code, stale context in PR descriptions.
- **Helper slop**: tiny wrappers that add no meaning, helper files created only to make one function look shorter, unnecessary indirection.
- **Type slop**: exported one-off types, custom result shapes, annotations where inference is clearer, types that only paper over awkward code.
- **Memo/callback slop**: `useMemo` / `useCallback` added without a measured or structural reason.
- **Effect slop**: effects that mirror props/state, reset derived state, or handle events after the fact.
- **Compatibility cruft**: bolted-on behavior that preserves accidental architecture instead of building the coherent end state.
- **Diff churn**: unrelated renames, formatting, comments, or wrappers that make the PR larger without improving the design.

### 5. React / Next.js Quality

- Apply “You Might Not Need an Effect”: derive values during render, move event-caused work into event handlers, and reset state with keys when appropriate.
- Avoid redundant state and synchronization effects.
- Do not add memoization just to quiet performance anxiety. Memoization should solve a real render identity or expensive computation issue.
- Prefer straightforward component boundaries over prop/callback gymnastics.
- For server/data code, avoid unnecessary waterfalls and run independent work concurrently when the codebase has a pattern for it.

### 6. Minimality

- Prefer deleting code over adding new structure.
- Prefer one clear function over several helper-y fragments unless extraction improves reuse or readability.
- Keep the fix proportional to the problem.
- Do not add architecture, docs, or comments unless they remove ambiguity for future readers.

## Output Format

Start with a verdict:

- `clean` — no meaningful concerns.
- `mostly clean` — minor cleanup only.
- `needs cleanup` — important reuse/composition/consistency issues.

Then list findings by priority. For each finding include:

1. File path and relevant symbol/area.
2. What reads as slop or inconsistency.
3. The existing pattern or code that should be reused, if found.
4. The minimal recommended fix.

If the user asked for review only, do not edit files. If the user asked to fix it, make the changes directly and summarize what changed.

## Red Flags

- “Can we reuse existing code?” was not answered with a search.
- New top-level helpers with vague names like `utils`, `helpers`, `shared`, or implementation-specific names.
- A function whose name hides important side effects.
- A directory containing only `index.ts` without a reason.
- Re-exporting something that is already exported elsewhere.
- New custom primitives where the product already has a component or pattern.
- Large comments explaining why awkward props or flags exist.
- Multiple new types just to support one local function.
- New callback/memo/effect code that disappears if state ownership is simplified.

## Rules

- Be direct and concise. Avoid extra explanatory fluff.
- Do not invent architecture. Ground claims in codebase patterns.
- Search before claiming something is reusable or inconsistent.
- If a pattern is not present in the codebase, say so and recommend the smallest clean alternative.
- Prefer `if` statements over ternaries when suggesting code changes in v0.
- When in doubt, optimize for code that reads obvious from left to right.