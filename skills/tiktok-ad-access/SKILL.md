---
name: tiktok-ad-access
description: "Use when you need TikTok ads or organic data and the usual endpoints refuse."
---

# TikTok: what you can read, and what to do when it refuses

TikTok has three public doors and, from a datacenter IP, all three are usually shut. This skill says
which one fails with what, what to use instead, and what to tell the operator.

## The doors, and how they fail

| Door | URL | Typical failure from a server |
|---|---|---|
| Commercial Content Library (EU ads, public by DSA) | `library.tiktok.com/ads?region=ES` | page renders, search returns 0 for everything; API `421 system busy` |
| Creative Center (top ads, trends) | `ads.tiktok.com/business/creativecenter/...` | `403 Access denied` |
| Profile | `tiktok.com/@handle` | followers/likes/bio load, video grid says "Something went wrong" |

**Critical check before concluding "they run no TikTok ads":** search a brand that certainly
advertises (SHEIN, Temu) in the same session. If that also returns zero, the library is refusing the
IP, not telling you the advertiser is absent. Recording "no ads" here is a false negative and it
poisons the report.

The library's search endpoint is `library.tiktok.com/api/v1/search` (params `region`, `type=1`,
`start_time`, `end_time`). Direct GET with `query=`/`keyword=` returns 404; POST with a JSON body
returns `421 system busy`, because the UI signs requests. Do not spend a session reverse-engineering
the signature.

## What still works without a key

1. **Indexed pages via search.** `site:tiktok.com "<brand>"` (or the brand plus a hashtag) returns
   video URLs with captions, hashtags and sometimes view counts. Enough to describe formats, hooks and
   cadence, not enough to measure volume.
2. **oEmbed for a video you already have.** `https://www.tiktok.com/oembed?url=<video url>` gives
   author, title and thumbnail without login. Useful to date or attribute a specific piece.
3. **Handles from the brand's own site.** Grep the homepage for `tiktok.com/@`: it is the reliable way
   to find the real handle. A handle with 0 followers and no bio is squatted, not the brand.

## What needs a decision (ask the operator, do not spend silently)

- **Scrape Creators key** (`SCRAPECREATORS_API_KEY`): RED already ships the collector, so TikTok and
  Instagram land in the same evidence bundle with citations. Metered, has a free tier. The right
  answer when the work is recurring.
- **Residential proxy**: the library itself is free and public; the IP is the only problem. Cheaper,
  but it is a greyer path in terms of terms of service.
- **firecrawl** (free tier, keyless): a one-off read when the page is JS-walled. Ask first, it burns
  quota.

## Reporting rule

If TikTok is blocked, the report says: which door, which HTTP code, what was attempted, and what the
fallback showed. "Not checked" and "no presence" are different findings, and only the first is honest
when the door was shut.

## Formats worth extracting when you can see them

Whatever the door, capture: video length, whether it is a comparison (two phones/two days), a
confession with a number, a "X vs the default" attack, a creator testimonial, or a founder reveal.
Those five shapes cover almost everything in habit and wellbeing apps, and they are cheap to
reproduce.
