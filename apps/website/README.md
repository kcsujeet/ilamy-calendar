# @ilamy/website

The documentation website for `@ilamy/calendar` (https://ilamy.dev). Astro +
Starlight, consuming the in-repo `@ilamy/calendar` via `workspace:*`.

## Develop

```bash
# from the repo root
bun run dev:website          # or: bun run --filter '@ilamy/website' dev
```

The site renders the live `@ilamy/calendar`, so build the library first if you
haven't yet: `bun run build:lib`.

## Build

```bash
bun run --filter '@ilamy/website' build   # outputs apps/website/dist
```

## Deploy (Cloudflare Pages — manual)

Deploys are manual via Wrangler (Direct Upload), not on push. Disable the Git
integration for the Pages project in the Cloudflare dashboard (Settings →
Builds & deployments) so pushes to `main` no longer auto-deploy.

```bash
# from the repo root — secrets come from the environment, never committed
export CLOUDFLARE_API_TOKEN=...   # a Pages-scoped API token (secret)
export CLOUDFLARE_ACCOUNT_ID=...  # your Cloudflare account id
bun run deploy:website
```

`bun run deploy:website` (root) runs `build:lib` then this app's `deploy`, which is
`astro build` then `wrangler pages deploy dist --project-name=calendar-ilamy-dev`.
Building the lib first ensures the docs render against the current `@ilamy/calendar` build.
Keep the two `CLOUDFLARE_*` values in your shell or an untracked `.env` (already
gitignored) — this is a public repo, so they must never be committed.
