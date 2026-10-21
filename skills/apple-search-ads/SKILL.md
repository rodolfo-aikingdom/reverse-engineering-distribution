---
name: apple-search-ads
description: "Use when you need Apple Search Ads: the EU repository gives creatives and copy."
---

# Apple Search Ads: the free repository nobody reads

Apple publishes every App Store ad it serves in the European Union for the last twelve months.
It is a legal obligation (DSA), it needs no key, and it returns the actual creative: the screenshot
that appears in the listing, the subtitle under the app name, and the promotional text. That last
part is the point: the subtitle is the copy each advertiser is buying traffic with, published in
the open. A tally of subtitles per app is a map of its copy tests.

Site: https://adrepository.apple.com

## Get the app id first

The repository is queried per app id, not per name. Get it from the store:

```bash
curl -s "https://itunes.apple.com/search?term=screen+time&entity=software&country=us&limit=50" \
  | python3 -c "import json,sys;[print(a['trackId'], a['trackName']) for a in json.load(sys.stdin)['results']]"
```

The same id works regardless of country: the repository covers all EU markets at once.

## The API

```bash
QL=$(python3 -c "import urllib.parse;print(urllib.parse.quote('type==APP;id==1497465230;datePreset==LAST_YEAR'))")
curl -s "https://adrepository.apple.com/api/v1/ad-repository-ads?ql=$QL&offset=0&limit=50"
```

- `offset` is a **page index**, not a row offset: `offset=1` returns rows 50 to 99.
- `limit` goes up to 100 (`limit=200` returns 400): two pages of 100 cover the year for almost
  every app.
- `pagination.totalResults` is the count for the whole year.
- `dataStartDate` and `dataEndDate` bound the window (last twelve months, rolling).
- Send a browser User-Agent. Requests sequential: parallel pages get dropped.

Response shape that matters:

```json
{"adId": "082e...", "appId": 1497465230, "countryOrRegion": "AT",
 "defaultLanguageDisplayName": "German", "format": "Icon + Asset Ad",
 "placement": "APPSTORE_SEARCH_RESULTS",
 "firstImpressionDate": "2026-09-30 00:00:00.0", "lastImpressionDate": "2026-10-15 00:00:00.0",
 "adBanner": {"subtitle": "Fokus, Website Limit & Blocker", "promotionalText": null,
              "shortDescription": "...", "iconPictureUrl": "https://is5-ssl.mzstatic.com/..."},
 "adAssets": [{"pictureUrl": "https://is5-ssl.mzstatic.com/image/thumb/.../2688x1242.jpg",
               "videoUrl": null, "width": 1242, "height": 2688, "orientation": "PORTRAIT"}]}
```

`adAssets[].pictureUrl` opens the creative full size; it is the same screenshot the user sees.
`videoUrl` is present only for video ads.

## What to do with it

1. **Copy tests.** Tally `adBanner.subtitle` per app. Every distinct subtitle is a promise being
   bought. Ten subtitles means ten bets; one subtitle repeated across hundreds of ads means the bet
   won.
2. **Spend intensity.** Ads per app per year is a proxy, not a budget: 615 for one app and 0 for
   another tells you who defends the store and who lives on organic.
3. **Market expansion.** Countries in the data show where they already pay; the absence of a country
   is information too, but only about the EU.
4. **Creative patterns.** Group by `format` and by whether `videoUrl` exists: screenshots, icon plus
   asset, video.

## Building a viewable gallery

Collect two pages per app (100 ads), dedupe by `adId`, keep the fields above, and write a static
page with one card per ad: image, subtitle, country, language, window, promo. Clicking the image
opens the asset. This is what `tools/build-apple-ads.py` does in the distribution repo, over
`research/apple-ads-<fecha>.json`.

## There is no page per ad, and what to use instead

The repository is a search UI, not a catalogue: `/ad/<adId>`, `/?adId=`, `/?appId=` and
`/app/<appId>` all return 404. Nothing on the site opens a single creative at a stable URL.

To give a reader more than the screenshot, use three things that do work:

1. **The record itself.** The JSON from the API has the full `shortDescription`, the targeting flags,
   `placement`, `developerName`, `legalName` and both impression dates. Show it inline (a `<details>`
   block in the page) or hand over the `adId` with the query that returns it.
2. **The advertiser's App Store page**, `https://apps.apple.com/app/id<appId>`: full description,
   rating count, reviews, recent updates. That is where the "more data" about the product lives.
3. **The API URL for that app**, which the reader can open in a browser and search for the `adId`:
   `.../ad-repository-ads?ql=type==APP;id==<appId>;datePreset==LAST_YEAR&offset=0&limit=100`.

Say this out loud in the deliverable. A gallery that only shows the image invites the question
"where do I see the rest", and the honest answer is the API plus the store listing.

- **Rate limit at 503.** After roughly twenty consecutive requests the API answers 503 for a
  while. Sleep thirty seconds and resume; do not hammer it in a loop. A full pull of 600 ads is
  seven requests of `limit=100`, which is fine.
- **Do not trust a zero that came from a wrong id.** Confirm the id with
  `https://itunes.apple.com/lookup?id=<id>&country=us` (check `trackName`), and if the count is 0
  search the name in the repository: `[]` means genuinely no EU ads, a row means you had the wrong
  id.

## Limits, stated plainly

- **EU only.** Ads served in the United States are not in this repository. There is no public
  equivalent for the US; that needs a paid tool.
- **Zero means zero in the EU.** An app with no rows there either does not buy App Store search in
  Europe or buys with a different app id. It does not mean it does not advertise.
- **No spend, no impressions, no conversions.** Only presence, dates, country, creative and copy.
- **Same-name apps.** `/api/v1/ad-repository-entities?name=<brand>&types=APP&limit=20` lists other
  apps with similar names: copycats and brand bidders.

## Pitfalls

- `datePreset` only accepts `LAST_YEAR`; anything else (`LAST_30_DAYS`, etc.) returns 400.
- Do not trust a name search on the site as evidence of the competitor set: apps often have localized
  names (`Opal: Wenig Bildschirmzeit`), so the same app appears under five titles.
- Do not report a count without the window: "615 ads" means "in the EU, in the last twelve months".
