# Security

RED runs on your machine, reads public data, and posts nothing anywhere. Here is what it can and cannot touch.

## Your keys

- Keys are read from environment variables, a local `.env`, or `~/.config/reverse-engineering-distribution/config.json` (mode `600`, written by the web UI). They are never written to reports, evidence bundles, logs, the disk cache, or API responses. `red doctor` only says whether a key is set.
- The Scrape Creators key is sent only to `api.scrapecreators.com` (as a header). The Anthropic key is used only by the official Anthropic SDK.
- Subscription engines (Claude Code, Codex) run your installed CLI with `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` and `OPENAI_API_KEY` removed from their environment, so they use your logged-in plan and never see your keys.
- The response cache (`~/.cache/reverse-engineering-distribution`) stores public API responses keyed by a hash of the request URL. It contains scraped public data, never keys.

## Fetching

- Every outbound URL is checked by `assertPublicUrl`: loopback, private, link-local and `file:` targets are refused, and redirects are followed by hand so every hop is checked. A hostile `robots.txt`, sitemap or redirect cannot point RED at your machine, your LAN, or its own local web server.
- The community collector makes **one request per community** to the public Atom feed, spaced 60s by default, and records a rate limit as an unknown instead of retrying in a loop.
- RED never authenticates anywhere. There is no cookie jar, no login, no session.

## The local web app (`red web`)

- Listens on `127.0.0.1` only. Requests whose `Host` is not `localhost:<port>` / `127.0.0.1:<port>` are rejected (DNS rebinding), and so are cross-origin writes.
- Strict CSP, no framing, API calls only to itself.
- Reports are model-written over scraped content, so they are treated as untrusted: rendered through DOMPurify with images, media, forms, SVG and inline styles removed, and every link restricted to `http(s)`.
- Report writers get no tools, in an empty scratch folder.

## What it will never do

Post, comment, DM, vote, follow, or submit a form on any platform. Distribution decisions belong to a human with an account; RED only measures and recommends.

## Reporting

Open an issue without sensitive details, or contact the maintainers privately for anything that could be exploited.
