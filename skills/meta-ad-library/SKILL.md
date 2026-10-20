---
name: meta-ad-library
description: "Use when you need real Meta ads: formats, durations, hooks, CTAs per brand."
---

# Meta Ad Library: read the ads, not the marketing

Use this when someone asks what a competitor runs on Meta (Facebook/Instagram), which formats they
use, how long the pieces are, or what hook and CTA they repeat. Works without any key.

## Why a browser and not curl

`facebook.com/ads/library` answers `403 Client challenge` to plain HTTP from a datacenter IP. A real
browser passes the challenge and the cards are readable from the DOM. Do not waste calls retrying
with different user agents.

## Step 1: search by a category phrase

Do not try to drive the advertiser combobox: clicking a suggestion does not reliably navigate. Search
the *copy* instead; each card prints the advertiser name, so filtering happens after extraction.

```
https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US
  &q=<phrase>&search_type=keyword_exact_phrase&media_type=all
```

Good phrases: the category noun ("screen time"), the promise ("stop doomscrolling"), the enemy
("brainrot"). Three or four phrases give dozens of unique cards. `active_status=all` if the question
is historical, `country=` per market (the EU also tags "EU transparency" ads).

## Step 2: extract cards

Cards lazy-load: extract, then scroll, then extract again, and dedupe by `Library ID`.

```js
(() => {
  const seen = new Set(); const out = [];
  for (const n of document.querySelectorAll('div')) {
    const t = n.innerText || '';
    if (!t.includes('Library ID:') || !t.includes('Sponsored')) continue;
    const idm = t.match(/Library ID:\s*(\d+)/);
    if (!idm || seen.has(idm[1])) continue;
    if (t.length > 1800) continue;            // a parent container, not a card
    seen.add(idm[1]);
    const v = n.querySelector('video');
    out.push({
      id: idm[1],
      started: (t.match(/Started running on ([A-Za-z]+ \d{1,2}, \d{4})/) || [,''])[1],
      versions: (t.match(/(\d+) ads use this creative/) || [,null])[1],
      videos: n.querySelectorAll('video').length,
      video_meta: v ? {
        duration: Math.round((v.duration || 0) * 10) / 10,
        w: v.videoWidth || null, h: v.videoHeight || null
      } : null,
      text: t.replace(/\s+/g, ' ').slice(0, 900)
    });
    if (out.length >= 40) break;
  }
  return out;
})()
```

Loop: `extract -> window.scrollTo(0, document.body.scrollHeight) -> sleep 3s`, three to five times.
Wrap the `js()` call in try/except: the page occasionally navigates and the CDP target dies.

## Step 3: parse the card text

The text is ordered: `Active -> Library ID -> Started running on -> Platforms (icons, no text) ->
[N ads use this creative] -> See ad details -> <advertiser> -> Sponsored -> <body> -> <DOMAIN> ->
<CTA>`. So:

- **Advertiser** = text between `See (ad|summary) details` and `Sponsored`. If it reads
  `"<Person> with <App>"`, the brand is buying creator content, not running brand creative. That is a
  strategy finding, not a parsing detail.
- **Hook** = first sentence of the body, verbatim. Quote it, do not summarise it.
- **CTA** = the last short phrase before/after the uppercase domain (`ITUNES.APPLE.COM`,
  `APPSTACK.LINK`). It tells you where the click lands: store, web, or a landing page.
- **Duration/aspect** come from the `<video>` element: 360x640 is 9:16, 360x360 is square. Duration is
  the cut length actually served, which is the number that matters for format.
- **Versions** = how many ads share that creative. It is a variant count, not a budget.

## Step 4: build the format inventory

Per brand, report: number of ads seen, video vs static, the set of durations, the repeated hook, the
CTA and the landing surface. **Every ad gets its permalink**
(`https://www.facebook.com/ads/library/?id=<Library ID>`); open one to confirm it resolves before
writing, and never hand the operator a count without the link that proves it. Then name the pattern in one line each, for example:

- "one script, two cuts" (11.7s and 45.7s, same words) means cheap iteration on a winning hook;
- "creator-named advertiser, 68 to 99s, 2-4 versions" means paid creator seeding with long-form;
- "static, one idea" means the offer is simple enough that video adds nothing;
- an app with a hot word in its name being bid on by others means the word is contested.

## Limits, say them out loud

- Meta publishes **no spend and no impressions** for commercial ads (only occasional "<100" bands).
  Ad counts are not budgets. Never convert them into money.
- Durations can be null when the video has not loaded; scroll it into view or accept the gap.
- The library is a search over live and paused ads, not a complete archive of everything ever run.
- The cards show platforms as icons: if you need the placement split, open "See ad details".
- This path depends on Meta's DOM. When it breaks, the fallback is a Scrape Creators key, not a
  different user agent.
