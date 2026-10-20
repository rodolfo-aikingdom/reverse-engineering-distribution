---
name: reverse-engineering-distribution
description: "Use when planning distribution for a product: audit where it can be posted, with evidence."
---

# Reverse Engineering Distribution (RED)

Use this when you need to answer "where does this product actually get distributed, and where are we
allowed to play" before writing a launch plan, a posting calendar or an outreach list.

Repo: `~/apps/reverse-engineering-distribution` (CLI `red`, MCP server `red`). It collects public
evidence about how a company reaches people and produces a deterministic 7/30-day plan.

## Order of operations

1. **Who is the competition?** If unknown, run `competitor-set-discovery` first. Do not guess.
2. **Collect**: `node dist/cli.js <url> --no-ai --communities r/a,r/b --out <dir>`.
3. **Read the plan**: `plan.md` says what to copy first and in what order. It is deterministic; if you
   disagree with it, say why, do not silently rewrite it.
4. **Ads and formats**: if the answer needs shortform, run `meta-ad-library` (works without keys).
   For TikTok read `tiktok-ad-access` before promising anything.
5. **Write** the report citing `[E#]`, then run `validate_report` (MCP) or `npm run eval`.
6. **Publish or post nothing.** Those are the operator's gates.

## MCP tools (preferred when the agent has them)

`reverse_engineer_distribution` (collect, returns `run_id`), `get_evidence`, `get_content`,
`get_distribution_plan`, `get_playbook`, `validate_report`, `write_report`, `compare_runs`.
Reads take `run_id`, not a file path. If the tools are missing, the agent was not restarted after
registering the server.

## The only verdicts that exist

| Verdict | Meaning |
|---|---|
| channel | format hosts links **and** the rules allow it: post there |
| mine | the pain lives there, product posts do not: harvest language only |
| gated | account-age/karma gate: it is a date, not a workaround |
| closed | a rule forbids apps, AI text or our identity: name the rule, do not retry |
| unknown | no rules read: ask a moderator, do not post |

Never promote a community from `unknown` to `channel` because the posts look promotional. Never post
in a `mine`. Never route around a gate. Measuring is not permission.

## How to use the output

1. `report.md` gives the engine and the surfaces; `plan.md` gives the order.
2. Every factual claim carries an `[E#]` id. Quote hooks and rules verbatim.
3. Anything under `Unknowns` means "not checked", with a manual-check link. Never "they do not do it".
4. Before proposing a post in a community, its rules text must be in the run (`--rules` file, blocks
   `== r/sub ==`). Reddit answers 403 to `about/rules` from a datacenter IP; ask the operator.
5. A pixel proves intent, not spend. Ad counts are not budgets. Never estimate money.

## Pitfalls

- One feed request per community, 60s apart. Reddit answers 429 to the second one.
- The feed gives the newest ~25 posts: it describes the current format, not the size of the community.
- Founders from free sources include weak matches. `[weak match]` is unusable.
- A community with 40% link posts and unread rules is still `unknown`, and the report must say so.
- `caju.lebit.app` is an internal site behind Cloudflare Access: it is not a public surface, no matter
  how polished the page looks.
