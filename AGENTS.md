# AGENTS.md

Instructions for agents working in this repo. Read this before changing code or producing a report.

## What this repo is

RED (Reverse Engineer Distribution) takes one link and returns **how that product gets distributed,
and where we are allowed to play**. It is a CLI plus an MCP server over the same pipeline:

```
sources/  ->  evidence bundle (observations + derivations + unknowns)
          ->  analyze/ (deterministic scorecard + 7/30-day plan, no LLM)
          ->  report/ (markdown report + validator gate)
```

- `src/sources/*` collect public data. One file per surface. They add **observations**, never
  conclusions.
- `src/analyze/scorecard.ts` turns evidence into channel strength. `src/analyze/plan.ts` builds the
  plan. Both are pure functions: same bundle in, same plan out.
- `src/report/validate.ts` is the gate. A report fails if a citation does not resolve, a required
  section is missing, the plan steps are not grounded, or an audited community has no verdict.
- `harness/` is the analyst bundle (role, guardrails, template, lessons, playbooks) versioned as
  `red-harness`. Its SHA is stamped into every report.

## Commands

```bash
npm install
npm run typecheck     # tsc --noEmit
npm test              # vitest, 66 tests
npm run eval          # validates examples/ against fixtures
npm run build         # tsc -p tsconfig.build.json -> dist/
node dist/cli.js <url> --no-ai --communities r/a,r/b --out /tmp/red-x
node dist/cli.js plan <url>          # plan for a saved run
node dist/cli.js mcp                 # stdio MCP server
node dist/cli.js doctor
```

Never claim a change works without running typecheck **and** tests. If you touch a source, add or
extend a test in `tests/`.

## Evidence contract (non-negotiable)

- Every item is an **observation** (seen at a URL or API) or a **derivation** (computed: posts/day,
  link share). Interpretations must cite `[E#]` ids and be labelled as interpretation.
- **An id is not evidence for a human.** Anything that goes into a document the operator will read
  carries a clickable URL: the ad permalink (`https://www.facebook.com/ads/library/?id=<Library ID>`),
  the video URL, the store listing, the sitemap, the API endpoint. If the operator cannot open it and
  see the same thing, the finding is not finished. `shortform-2026-10-20.json` is the model: every ad
  has a `permalink`, and the doc links the searches that produced them.
- A negative needs a negative observation. "No pixels detected" is evidence; "they do not run paid"
  is not.
- Unchecked things are **unknowns** with a `manualCheck` link. Never fill a gap with a plausible
  number.
- **Spend is never invented.** A pixel proves intent, not budget. Ad counts are not budgets.
- Weak matches (for example founder names pulled from search) are labelled and unusable.

## What each source can actually do

| Source | Without keys | With `SCRAPECREATORS_API_KEY` |
|---|---|---|
| website, offers, pricing, tracking stack | yes | yes |
| SEO (sitemaps, page families, freshness), llms.txt / GEO stance | yes | yes |
| Wayback history | yes | yes |
| App Store / Google Play | yes | yes |
| Hacker News / launches | yes | yes |
| Apple Search Ads (EU Ad Repository) | yes | yes |
| Reddit communities (public Atom feed) | yes (1 req/min) | yes |
| Funded social (TikTok, IG, YouTube, X, LinkedIn), Meta/TikTok ad libraries, founders | **no** | yes |

## Sources that only work through a real browser

Two surfaces reject plain HTTP from a datacenter IP. Do not "fix" them by adding a fetch call; that
path is dead and will keep returning 403.

- **Meta Ad Library** (`facebook.com/ads/library`): HTTP returns `403 Client challenge`. With a real
  browser it loads and the cards can be read from the DOM. Use the URL params
  `active_status=active&ad_type=all&country=US&q=<phrase>&search_type=keyword_exact_phrase`.
  Scroll 3 to 5 times, extracting before each scroll, and dedupe by `Library ID`. Do not try to drive
  the advertiser combobox: clicking it does not reliably navigate. Keyword search on the category's
  phrases finds the competitors anyway, because the advertiser name is printed on each card.
  From each card you get: advertiser, start date, video vs static, duration and video aspect (from
  the `<video>` element), number of versions ("N ads use this creative"), full copy and CTA.
  Meta does **not** publish spend or impressions for commercial ads. Never infer them.
- **TikTok**: `library.tiktok.com` is public by EU law, but its search API answers
  `421 system busy` from this host (verified with SHEIN, a brand that certainly advertises, so it is
  an IP block, not an absence of ads). Creative Center answers `403`. Profile pages load follower
  counts but the video grid fails. Fallbacks: indexed public pages via web search (`site:tiktok.com`),
  oEmbed for a known video URL, a Scrape Creators key (RED already has the collector), a residential
  proxy, or firecrawl as a one-off with the operator's approval.

If a browser-only surface is needed, say so in the report and record it as an unknown instead of
silently omitting the channel.

## Skills that ship with this repo

`skills/` holds the reusable procedures. Install them into an agent with
`./scripts/install-skills.sh` (copies them to `~/.hermes/skills/distribution/`).

| Skill | Use it when |
|---|---|
| `reverse-engineering-distribution` | planning distribution for a product, auditing communities, running RED |
| `competitor-set-discovery` | you do not yet know who the competitors are |
| `meta-ad-library` | you need real Meta ads, formats, durations, hooks or CTAs |
| `tiktok-ad-access` | you need TikTok ads or organic and hit a wall |
| `apple-search-ads` | you need App Store ads: EU repository, creatives and subtitle copy |

## Data and artifacts

- Saved runs: `~/.cache/reverse-engineering-distribution/runs/<domain>-<stamp>.json`
  (`RED_CACHE_DIR` overrides it). Regenerable, so it is cache, not storage.
- Reports: whatever `--out` says; `red-reports/` by default.
- The consuming repo keeps the readable layer (`research/<date>-<topic>.md` plus the JSON/JSONL that
  backs it). Every number in those documents must trace to a file there or to the public API that
  returned it.

## Vendors and credentials

Keys come from the environment or a local `.env` (never committed). `SCRAPECREATORS_API_KEY` is
optional and metered: ask before spending credits. Any credential in an output, log or report is
`[REDACTED]`.

## House rules

- The tool reads public data and **never posts, comments, DMs or publishes anything**. Those are the
  operator's gates.
- Community verdicts are exactly five: `channel`, `mine`, `gated`, `closed`, `unknown`. Measuring a
  community is not permission to post in it.
- A community with unread rules stays `unknown`, even with 40% link posts.
- Published reports: no em dashes, no en dashes, and every factual sentence carries a citation.
- When a surface is blocked, write the block into the report with the HTTP code. Do not paraphrase it
  into "no presence".

## Adding a source

1. Create `src/sources/<name>.ts` exporting a collector that pushes `Observation` items into the
   bundle and registers unknowns with a manual-check link.
2. Add the source name to the `Source` union in `src/evidence.ts` and to `SOURCES` in `src/index.ts`.
3. Teach `src/analyze/scorecard.ts` (what it means for a channel) and `src/analyze/plan.ts` (what to
   do about it) only if the observation actually changes a decision.
4. Add a fixture in `tests/helpers.ts` and a test that fails if the source silently stops returning
   data.
5. If it needs a key, it must degrade to an unknown, never to a crash.
