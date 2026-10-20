# Contributing

PRs welcome, especially:

- **New surfaces and sources** (newsletter sponsorships, podcast ads, directories, G2/Capterra, Discord/Slack communities, Bluesky/Threads) following the evidence contract in [AGENTS.md](AGENTS.md).
- **Rule patterns** in `src/sources/communities.ts` — a real community rule that closes a channel and is not caught yet, with the quote.
- **Lessons and playbooks** in `harness/`, backed by an eval run.
- **Eval fixtures**: run `red <url> --no-ai --communities ...`, copy `evidence.json` to `evals/fixtures/<domain>.evidence.json`, and the written report to `examples/<domain>.md`.

Rules for a PR that touches the verdicts or the plan: the behaviour change and its test land together, and a new closing rule class needs a test that proves it closes the channel even when the measurement looks open.

Run `npm run typecheck && npm test && npm run eval` before opening a PR.
