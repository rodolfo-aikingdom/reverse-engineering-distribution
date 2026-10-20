---
name: reverse-engineering-distribution
description: "Use when planning distribution for a product: audit where it can be posted, with evidence."
---

# Reverse Engineering Distribution (RED)

Use this when you need to answer "where does this product actually get distributed, and where are we allowed to play" — before writing a launch plan, a posting calendar or an outreach list.

The bundled repo is `~/apps/reverse-engineering-distribution` (CLI `red`). It collects public evidence about how a company reaches people and produces a deterministic 7/30-day plan.

## Run it

```bash
cd ~/apps/reverse-engineering-distribution
node dist/cli.js <domain> --no-ai --communities r/a,r/b --out /tmp/red-<domain>
node dist/cli.js plan <domain>              # plan for a saved run
node dist/cli.js <domain> --json            # evidence bundle to stdout
```

Outputs: `report.md`, `plan.md`, `evidence.json`. Without `SCRAPECREATORS_API_KEY` you still get search, GEO, HN, store, funnel and community audits for free.

## The only verdicts that exist

| Verdict | Meaning |
|---|---|
| channel | format hosts links **and** the rules allow it: post there |
| mine | the pain lives there, product posts do not: harvest language only |
| gated | account-age/karma gate: it is a date, not a workaround |
| closed | a rule forbids apps, AI text or our identity: name the rule, do not retry |
| unknown | no rules read: ask a moderator, do not post |

Never promote a community from `unknown` to `channel` because the posts look promotional. Never post in a `mine`. Never route around a gate.

## How to use the output

1. Read `report.md` for the engine and the surfaces, `plan.md` for the order.
2. Every factual claim carries an `[E#]` id; quote the hook or the rule verbatim, never paraphrased.
3. Anything in `Unknowns` is not "they don't do it" — it is "not checked", with a manual-check link.
4. Before proposing a post in a community, the rules text must be in the run (`--rules` file). Reddit blocks `about/rules` from datacenter IPs; ask the operator for the sidebar text.
5. Publishing, commenting and DMing are the operator's gate. RED only measures and recommends.

## Pitfalls

- One anonymous feed request per community: 60s apart by default. Do not parallelize, Reddit answers 429 to the second request.
- The feed gives the newest ~25 posts: it describes the current format, not the community's size.
- Founder names from free sources include weak matches (people from other companies). Treat `[weak match]` as unusable.
- A community with 40%+ link posts and no rules read is still `unknown`, and the report must say so.
