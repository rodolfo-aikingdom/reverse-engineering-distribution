# How Plausible Analytics gets distributed

**One-line verdict:** A launch-and-search machine: Hacker News spikes that feed a comparison-page SEO family aimed at Google Analytics, with self-hosting communities carrying the long tail.

## TL;DR
- Their distribution is built on search pages that answer "alternative to Google Analytics": 165 URLs, and 41 of the 52 root pages were updated in the last 90 days, including a `vs` page, a script-size tool and an ad-cost calculator [E9, E5].
- Hacker News is their proven spike surface, not a habit: 68 submissions ever, the best one at 1,214 points, and a Show HN in 2020 at 351 points [E11].
- There is no paid motion visible on the site at all: no ad or attribution pixel of any platform was found on the homepage [E3].
- The three communities where this category is discussed cannot be called open from here: r/selfhosted and r/webdev host links (44% and 40% of posts) but their rules were never read, and r/analytics has zero link posts [E8, E15, E16].

## Channel scorecard

| Channel | Status | Strength | What we saw | Evidence |
|---|---|---|---|---|
| SEO | active | ●●○ | 165 URLs, 0 programmatic families, 12 content updates in 90d (41 on root pages) | [E9] |
| AI search (GEO) | none | ○○○ | no llms.txt; no AI bot blocked in robots.txt | [E10] |
| Launches (HN / PH) | active | ●●● | 68 HN submissions, best 1,214 points, one Show HN | [E11] |
| Paid | unknown | ○○○ | no ad pixel on the homepage | [E3] |
| Organic social | unknown | ○○○ | handles found (X, LinkedIn, GitHub) but no stats collected | [E2] |
| Founders | unknown | ○○○ | two names found, both weak matches | [E13] |
| Communities | — | — | three audited, none confirmed open | [E8, E15, E16] |

## The engine

The loop is **launch → search → community**: a Hacker News post puts the product in front of the exact audience that hates Google Analytics [E11], the debate leaves search demand behind it ("alternative to Google Analytics", "script size"), and the site answers that demand with a small family of pages built for the query rather than the blog: `/vs-google-analytics`, `/google-analytics-script-size`, `/ad-cost-calculator`, `/vs-cloudflare-web-analytics` [E5, E9]. The blog carries the volume (108 of 165 URLs) but it is not what the root pages do.

The offer is a 30-day trial with three flat monthly prices ($9, $14, $19) plus a sales-assisted tier, and no free plan [E7]. The positioning has been the same for years and only got sharper: in 2019 the H1 was "Simple analytics for your website"; in 2024 it is "Easy to use and privacy-friendly Google Analytics alternative" [E14]. That is the whole strategy in one edit: stop selling analytics, start selling the exit from Google.

## Where we can play

- **r/selfhosted** — unknown, not open. 25 posts in a day, 44% carry an external link and 8% are self-promo, so the format clearly hosts products, but the rules were not read (Reddit blocks this from a datacenter IP) [E8]. Action: ask a moderator before the first post; the measurement says the format fits, the rules decide.
- **r/webdev** — unknown, same reason: 40% link posts, 4% self-promo, 24% questions [E15]. This is the highest-volume candidate of the three; it is also the one where a product post is most likely to be read as spam.
- **r/analytics** — mine. 25 posts over 8 days, 0% carry links, 56% are questions ("What part of your reporting work is still manual every month?") [E16]. There is no product-post format here; there is a language goldmine: the exact words practitioners use for the manual work.
- **Search** — channel to copy, and the one with evidence behind it: 41 fresh root pages in 90 days, in a site of only 165 URLs [E9]. The template is "one query, one page, one comparison", not "publish more blog posts" (the blog is 108 URLs and is not where the fresh work is).
- **Launches** — channel, already proven in this category: 68 submissions, best 1,214 points, comments in the hundreds per post [E11]. Their best-performing non-launch title is a thesis, not a product announcement: "Tech-savvy audiences block Google Analytics".
- **Paid** — unknown. No pixel was found on the homepage [E3]. That is not proof they do not buy; it means we have no observation of it. Do not copy paid from this bundle.

## Distribution plan

1. **Day 0 — baseline.** Record trial starts, signups and the source of each one, plus the current ranking of the three queries we intend to answer. Without these numbers the rest of the plan cannot be settled [E9].
2. **Day 1–2 — mine r/analytics.** Pull 20 thread titles and 10 objections from the questions there and rewrite our landing page in those words, no product mention [E16].
3. **Day 2–3 — ask, do not post.** Message the moderators of r/selfhosted and r/webdev with the exact post we intend to publish and the rule we think allows it; without an answer the channel stays unconfirmed [E8, E15].
4. **Day 3–10 — build the query pages, not the blog.** Ship the first 5 pages: `vs <incumbent>`, a calculator and a "how much does the script cost" page, each answering one query completely. Their root pages are 41 of 52 fresh in 90 days, inside a 165-URL site: small site, high freshness, one page per query [E9, E5].
5. **Day 7–21 — one launch, prepared.** Title with a number or a thesis in it, first comment stating who it is for and what it replaces, and four hours of answers in the thread. The category's best posts are arguments, not announcements [E11].
6. **Day 30 — settle.** Re-run the teardown and diff: which page earned the search position, which community post survived, which launch comment turned into a trial. Kill the step that moved nothing [E9, E11].

## Hooks worth copying

Quoted exactly, all from their own surfaces:
- "Tech-savvy audiences block Google Analytics" — 1,214 points, 681 comments [E11]
- "How We built a $1M ARR open source SaaS" — 522 points [E11]
- "Show HN: Plausible – Self-Hosted Google Analytics alternative" — 351 points, their launch [E11]
- "Easy to use and privacy-friendly Google Analytics alternative" — current homepage H1 [E1]
- "Simple analytics for your website" — the same H1 in 2019, before they named the incumbent [E14]

The pattern: name the enemy, put a number in the title, and let the comments do the distribution.

## Funnel & offer

30-day free trial, three flat monthly prices ($9, $14, $19), no free plan, and a sales-assisted tier for larger accounts [E7]. The entry page is a comparison against the incumbent [E5], and the proof above the fold is social: "trusted by thousands of organizations, including Stripe, Mozilla, Mongo…" [E1]. What a visitor from a launch thread sees in 10 seconds: the enemy's name, three prices, a trial button. There is no demo gate and no form.

## What we could not see

- **Social distribution.** The X, LinkedIn and GitHub accounts are linked from the site [E2], but follower counts, cadence and reach need a Scrape Creators key. Not measured, therefore not scored.
- **Paid.** No pixel on the homepage [E3] and no ad-library access in this run. Their paid motion, if it exists, is unknown.
- **Founders.** The two names the free sources returned are weak matches (a founder of a different company appears in the list) [E13]. Do not use them in a report or an outreach message without checking the about page.
- **Community rules.** Reddit returns 403 to this host on `about/rules`; the rules for all three communities must be pasted by a human before any posting decision [E8, E15, E16].

## Unknowns & how to check

- **Organic social (X, LinkedIn, GitHub):** <https://x.com/PlausibleHQ> — set `SCRAPECREATORS_API_KEY` to measure cadence and reach.
- **Paid (Meta, Google, LinkedIn):** <https://www.facebook.com/ads/library/> and <https://adstransparency.google.com/> — set `SCRAPECREATORS_API_KEY`, or check by hand.
- **Product Hunt:** <https://www.producthunt.com/search?q=plausible> — no key needed, not collected in this run.
- **Community rules:** paste the sidebar of r/selfhosted, r/webdev and r/analytics into a rules file and re-run with `--rules`.
- **App Store / Play:** no app found, so Apple Search Ads were not checked — correct for a web product, and reported as unknown rather than absent.
