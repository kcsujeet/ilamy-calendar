# Code placement and project structure

Part of the code-review skill (`SKILL.md`). Colocation, Bulletproof type-folders, and package/feature boundaries (the structural half of section F). Control-flow/expression readability lives in `readability.md`.

## Misplaced-modules sweep

A context/store/util/hook living under `components/` is almost always in the wrong folder. Bulletproof React organizes a feature BY TYPE (`components/`, `contexts/`, `hooks/`, `types/`, `utils/`). Run this over ALL changed files (added/untracked too), not just `/tmp/srcfiles.txt`. Adjust the path globs to the repo layout.

```bash
git diff --name-only origin/main..HEAD -- 'src/**/*.ts' 'src/**/*.tsx' > /tmp/allchanged.txt
git ls-files --others --exclude-standard -- 'src/**/*.ts' 'src/**/*.tsx' >> /tmp/allchanged.txt
while IFS= read -r f; do [ -f "$f" ] || continue; case "$f" in
  */components/*)
    grep -q 'createContext(' "$f" && echo "$f: createContext() under components/ -> move to contexts/ (or stores/)"
    case "$f" in
      */index.ts) ;;                                   # re-export barrel: fine
      */components/*/use-*.ts|*/components/use-*.ts) echo "$f: hook under components/ -> move to hooks/" ;;
      *.ts) echo "$f: non-component .ts under components/ -> likely utils/ (helpers), types/, or contexts/" ;;
    esac ;;
esac; done < /tmp/allchanged.txt
```

Every hit is a candidate: open the file and confirm before flagging.

## Checklist items this backs

- **Colocation + Bulletproof type-folders.** Verified with the misplaced-modules sweep above, not by eyeballing. A component's test sits next to it (`foo.tsx` + `foo.test.tsx`); shared code sits at the lowest common ancestor; a feature-specific util moved into a global `lib/` is questioned. **Within a feature/package, code is organized BY TYPE** — `components/`, `contexts/` (or `stores/`), `hooks/`, `types/`, `utils/` — mirroring `packages/calendar/src/features/calendar/`. A context/store, a pure helper, or a hook dumped inside `components/<name>/` is a defect, not colocation: a context belongs in `contexts/`, a `createContext()` module is never under `components/`; a pure helper (e.g. `recurrence-presets.ts`) belongs in `utils/` next to its siblings; a `use-*` hook belongs in `hooks/`. The `components/<name>/` folder holds only that component group and its sub-components. Confirm each new/moved file landed in the type-correct folder; flag any the sweep surfaced. (Reference: Bulletproof React project-structure doc, "organize by type within a feature, don't deeply nest.")
- **Package/feature boundaries (shared code lives in shared packages).** Per `.agents/rules/architecture.md`: a component used by more than one feature or package belongs in `@ilamy/ui` (shared helpers in `@ilamy/utils`, shared types in `@ilamy/types`), not in a feature folder or a plugin package that another consumer imports from. Flag (a) a plugin package importing the core's `@/features/...` internals instead of the public `@ilamy/calendar` API; (b) the core's public API being widened (a new `export` from `@ilamy/calendar`) just so another package can reuse an internal component/helper, when the right move is to relocate that piece to `@ilamy/ui`/`@ilamy/utils`; (c) the same component/logic duplicated or cross-imported between two features/packages. When the diff exports something new from a feature/core package for a sibling package to consume, ask "should this live in `@ilamy/ui` instead?"
