---
name: competitor-set-discovery
description: "Use when you do not know who a product competes with: build the set from the store."
---

# Competitor set discovery

Use this when someone asks "who are we competing with" and there is no list yet. Never build the list
from memory: the App Store and the ad libraries already sorted the market by traction.

## 1. Start from the store, not from the idea

Query the public iTunes search API with **seed phrases per mechanic**, not per category. Apps index
their copy, so mechanics surface competitors that category names hide.

```bash
curl -s "https://itunes.apple.com/search?term=screen%20time&country=us&entity=software&limit=25"
curl -s "https://itunes.apple.com/lookup?id=<id1>,<id2>,..."   # details in one call
```

Useful seeds: the category noun ("screen time"), the promise ("digital detox", "focus"), the
mechanic ("earn screen time", "app blocker"), the enemy ("quit scrolling"). Two to five seeds is
enough to see the shape of the market.

## 2. Rank by what cannot be faked

`userRatingCount` is the traction signal; `averageUserRating` is quality; `releaseDate` is the speed
cohort. Dedupe by `trackId`. Build:

| App | Ratings | Avg | Since | Mechanic it sells (one line) |
|---|---|---|---|---|

Then split the market in two cohorts, and say it out loud: the ones that accumulated for years, and
the ones that arrived in the last 12 months and are already top 10. The second cohort is the threat
and the reference; the first is the wall.

## 3. Get the official site, then let RED do the channels

`sellerUrl` in the lookup response is the developer's site. For apps without it, search the seller
name plus the app name. With the domain, run:

```bash
node dist/cli.js <domain> --no-ai --only website,seo,apps,history --out <dir>
```

That gives indexed URLs, page families, llms.txt stance, Apple Search Ads counts (EU repository),
Hacker News launches, pricing ladder and the store bar. One run per competitor.

## 4. Read the ads to find who is really fighting whom

Run `meta-ad-library` on the category phrases. Two things show up there that the store never shows:

- **Keyword parasites**: rivals using a competitor's brand in their copy or CTA. Real examples found
  this way: an app called "log off - unrot your brain" (a different seller) running 11 ads on Unrot's
  angle, and a brain-training app buying "Unrot Your Brain" as its CTA. When the hot word is taken,
  brand positioning changes.
- **Creator-led advertisers**: the advertiser name is the person, not the brand
  ("<Name> with <App>"), which means paid creator seeding rather than brand creative.

Check the seller before attributing anything: same app name does not mean same company, and a
lookalike is a competitor in the ad auction even if it is not the company you were studying.

## 5. Decide the set

Keep three to five, with a reason each: the volume leader, the closest by mechanic, the fastest
riser, and the one whose channel we could copy cheapest. Everything else goes in an appendix.

## Pitfalls

- Ratings are not installs and not revenue. The App Store shows only counts.
- 0 ratings does not mean 0 users: a new app can have a real install base and no reviews yet.
- The seller name is the entity (a holding company, a person, a shell). Say it as it appears and do
  not infer the team from it.
- A competitor with no visible web presence is not a competitor without distribution: it usually
  means their engine is paid social or creator seeding. Record it as an unknown with a manual check.
