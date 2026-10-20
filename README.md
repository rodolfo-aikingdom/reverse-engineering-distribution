# RED: Reverse Engineer Distribution

### Paste a link. Get the distribution machine behind it, and the list of places you are allowed to play.

**Hooks · cadence · search families · communities (channel or language mine) · launches · store · paid amplification — every claim cited, and a 7/30-day plan at the end.**

```bash
red notion.so
red plausible.io --communities r/selfhosted,r/webdev,r/analytics
red plan plausible.io
```

Most "distribution" advice is a list of channels with no evidence. RED collects what is public about how a product actually reaches people, separates the surfaces that are open to us from the ones that only look open, and writes the next 30 days.

Everything RED could not see is listed as **unknown** with a link to check it by hand. "Not checked" is never "they don't do it", and a community whose rules we could not read is **unknown, not open**.

## Why this repo exists

Two repos came before it, and this is a reimplementation of the second adapted to distribution:

- [REA, Reverse Engineer Anything](https://github.com/morluto/rea) — the pattern: investigate → spec → build → verify, with an evidence contract.
- [REM, Reverse Engineer Marketing](https://github.com/dansugc/reverse-engineer-marketing) (MIT, by DansUGC) — the collector engine RED is built on: website forensics, pixels, SEO/sitemaps, Wayback, ad libraries, social stats, founders, Reddit, HN, a versioned harness and a validator.

RED keeps that engine and changes what it is for. The marketing teardown asks *what are they doing*; distribution asks *where can we play, and what do we do on Monday*. Concretely, what is new here:

| | REM | RED |
|---|---|---|
| Question | how they acquire customers | where their distribution works **and where we are allowed in** |
| Communities | mentions and brand/founder replies | audited: cadence, link share, promo share, and the rules quoted and classified |
| Verdicts | channel scorecard | scorecard **+ channel / mine / gated / closed / unknown per community** |
| Output | report + "steal this playbook" | report **+ deterministic 7/30-day plan** with a day-0 baseline and a day-30 settle |
| Harness | marketing analyst, 10 channel playbooks | distribution operator, 9 surface playbooks, rules-first guardrails |
| Tests | 23 | 66 (inherited parsers + communities, plan, harness, validator) |

## Quick start

```bash
npm install
npm run build
node dist/cli.js plausible.io --no-ai
# or, once linked / installed
red plausible.io --no-ai
```

Zero keys gets you: website positioning and offer, tracking pixels (including inside GTM containers), SEO/sitemaps and programmatic families, AI-crawler stance, Wayback history, App Store/Play, Hacker News, and **community audits** from the public Atom feed.

Add keys for the rest:

```bash
export SCRAPECREATORS_API_KEY=...   # ad libraries, social stats, founders, Reddit search (~25–50 credits/run)
export ANTHROPIC_API_KEY=...        # written report (otherwise your agent writes it over MCP)
```

Output goes to `./red-reports/<domain>-<date>/`: `report.md`, `plan.md` and `evidence.json`.

## The part that matters: where we can play

A community is a distribution channel only when two things are true, and both are checkable:

1. **The format hosts products.** Measured from the community's own posts: share of posts carrying an external link, share that are self-promo, share that are questions. Under 8% link posts, a product post is foreign to the format.
2. **The rules allow it.** Quoted and classified. Four classes close or gate a channel, and promotion is only one of them:

| Class | What it looks like | Effect |
|---|---|---|
| apps / promo | "no apps", "no self promotion", "stealth marketing" | closes the channel |
| AI content | "AI-generated", "even if it is just for translation" | an agent-written post violates it even when a human publishes it |
| identity | "must not identify primarily as…" | closed without lying about who is writing |
| account gate | "account at least 30 days old and 50 karma" | a date, not an obstacle to route around |

Verdicts: **channel** (post there), **mine** (harvest the language, do not post), **gated** (earn the account first), **closed** (the rule that forbids it is named), **unknown** (rules never read — ask a moderator, do not post).

Reddit serves `about/rules` as 403 to datacenter IPs, so rules are pasted by a human:

```bash
red plausible.io --communities r/selfhosted,r/webdev --rules community-rules.txt
```

`community-rules.txt`:

```
== r/selfhosted ==
1. No self promotion...
== r/webdev ==
...
```

Without that file, a community with 44% link posts still comes back **unknown**: the measurement is there, the permission is not.

## The plan

`plan.md` is deterministic — no model, same input same output:

- **Day 0**: the baseline, before anything is posted.
- **Days 1–7**: mine the communities that only give language, post in the ones that allow it, publish on the surface that already works for them.
- **Days 8–30**: copy the page family (or the cadence), defer paid until there is a winning organic artifact, and settle on day 30 by diffing.
- **Closed / Unconfirmed**: the places not to retry, each with the reason.

Every step cites the evidence ids it was copied from. If a channel was not observed, it does not appear.

## Evidence contract

Every item is an **observation** (seen at a URL or API) or a **derivation** (computed, e.g. posts/day, link share). Interpretations must cite evidence ids and be labelled. Unchecked things are **unknowns**, with a manual-check link. A pixel proves intent, not spend; dollar spend is never invented.

The rules that must not regress are listed in [CONTRIBUTING.md](CONTRIBUTING.md) and enforced by `tests/communities.test.ts` and `tests/plan.test.ts`.

The harness in `harness/` (role, guardrails, template, lessons, 9 playbooks) is versioned and hashed into every report, so a prompt change is a change you can eval and roll back.

## Use it from your agent (MCP)

```bash
red mcp     # stdio MCP server
```

| Tool | What it does |
|---|---|
| `reverse_engineer_distribution` | Collects everything for a URL, optionally audits communities. Returns scorecard + community verdicts + evidence index + unknowns, and a `run_id` |
| `get_evidence` | Full data for specific ids or a source (hooks, sitemap families, community measurements, rules) |
| `get_content` | The actual posts, videos and ads to quote or show |
| `get_distribution_plan` | The deterministic 7/30-day plan (markdown or JSON) |
| `get_playbook` | Analyst role, evidence rules, template, lessons, one playbook per surface |
| `validate_report` | Citations resolve, sections exist, plan grounded, every audited community judged, no invented spend |
| `write_report` | Optional server-side report (needs `ANTHROPIC_API_KEY`) |
| `compare_runs` | What changed since last time |

Named prompts: `investigate_distribution`, `where_can_we_play`, `steal_the_distribution`, `what_changed`, `audit_unknowns`.

## What it finds

| Area | What RED pulls | Key? |
|---|---|---|
| **Communities** | per subreddit: posts/day, link share, promo share, question share, medians, samples; rules classified into the four closing classes | free (rules pasted) |
| **Search** | sitemaps, programmatic page families, comparison/alternative pages, freshness, locales, top results | free |
| **AI search (GEO)** | llms.txt, which AI crawlers are blocked or allowed | free |
| **Short-form & social** | TikTok, Instagram, YouTube, X, LinkedIn: followers, posts/week, median reach, top hooks | Scrape Creators |
| **Launches** | Hacker News submissions with points and comments, Show HN, Product Hunt | free / SC |
| **Paid** | Meta/Google/LinkedIn ad libraries, Apple Search Ads (EU), plus pixels incl. GTM | SC / free |
| **Founders** | names from Wikidata, JSON-LD and the site, ranked by confidence, with audience | free / SC |
| **Store** | App Store ratings, release age, update cadence, Play installs, listing copy | free |
| **Funnel & offer** | positioning, CTAs, pricing model, free plan/trial, sales-led signals, affiliate program | free |
| **Positioning history** | homepage title/H1/CTAs over time from the Wayback Machine | free |

## Limits (honest)

- **Community rules** cannot be fetched from a datacenter IP. RED measures; a human supplies the rules. Until then the verdict is unknown, by design.
- **One request per community**, spaced 60s by default (`--delay`), because Reddit's anonymous feed 429s immediately otherwise.
- Community data comes from the newest ~25 posts, not history: it describes the current format, not the subreddit's size.
- **Apple Search Ads** are only visible for the EU. TikTok and X ads have no global public library. Reddit's ad library was shut down.
- Founder matches from search can be wrong; weak matches are flagged and must not be used as fact.
- RED **reads** public pages and public libraries only. It never logs in as anyone, never posts, never comments and never runs anything on the target.

## Use it responsibly

Study the strategy, ship your own. Learn which angles, cadences, offers and page templates work; do not republish competitors' ads, footage, copy or brand assets. Respect each site's terms, each community's rules and your local law. A channel that only works if you lie about who you are is closed.

## Develop

```bash
npm run typecheck   # tsc --noEmit
npm test            # 66 tests: parsers, communities, plan, harness, validator
npm run eval        # validate the recorded example against its fixture
npm run build
```

Adding a source: write a collector in `src/sources/` that adds observations or derivations (never conclusions) and records unknowns with a manual-check link, then teach `src/analyze/scorecard.ts` and `src/analyze/plan.ts` what it means. See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules that must not regress.

The inherited web UI (`red web`, `red demo`) still opens a recorded run in the browser; it is not covered by the test suite and is not the surface this fork is maintained for.

## License

MIT. The collector engine descends from [REM by DansUGC](https://github.com/dansugc/reverse-engineer-marketing) (MIT, © 2026 Daniel Hangan); the analysis layer, the community audit, the plan and the harness are this repo's. See [NOTICE](NOTICE).
