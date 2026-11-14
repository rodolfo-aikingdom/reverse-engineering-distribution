#!/usr/bin/env python3
"""Read public TikTok video metadata from the video's own HTML."""

import argparse
import datetime as dt
import json
import re
import sys
import urllib.parse
import urllib.request

STATE = re.compile(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">(.*?)</script>', re.S)
VIDEO_ID = re.compile(r"/video/(\d+)")


def probe(url: str) -> dict:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"}:
        raise ValueError("Only public HTTPS TikTok URLs are supported")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        final_url = response.url
        if urllib.parse.urlparse(final_url).hostname not in {"tiktok.com", "www.tiktok.com", "m.tiktok.com"}:
            raise ValueError("Redirect left TikTok")
        page = response.read().decode("utf-8", errors="replace")
    match = VIDEO_ID.search(urllib.parse.urlparse(final_url).path)
    state = STATE.search(page)
    if not match or not state:
        raise ValueError("No video ID or TikTok video state in this public page")
    root = json.loads(state.group(1))["__DEFAULT_SCOPE__"]
    item = root["webapp.video-detail"]["itemInfo"]["itemStruct"]
    if str(item.get("id")) != match.group(1):
        raise ValueError("Video ID differs from the URL")
    author = item.get("author") or {}
    video = item.get("video") or {}
    stats = item.get("stats") or {}
    return {
        "url": final_url.split("?", 1)[0],
        "id": match.group(1),
        "author": author.get("uniqueId"),
        "caption": item.get("desc"),
        "duration_seconds": video.get("duration"),
        "published_utc": dt.datetime.fromtimestamp(int(item["createTime"]), dt.timezone.utc).isoformat() if item.get("createTime") else None,
        "play_count": stats.get("playCount"),
        "save_count": stats.get("collectCount"),
        "share_count": stats.get("shareCount"),
        "comment_count": stats.get("commentCount"),
        "read_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    args = parser.parse_args()
    try:
        print(json.dumps(probe(args.url), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        print(f"probe failed: {exc}", file=sys.stderr)
        sys.exit(1)
