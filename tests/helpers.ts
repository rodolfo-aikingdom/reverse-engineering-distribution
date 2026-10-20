// Shared fixtures for the distribution tests: a small but realistic bundle with
// one of each kind of community verdict, and a scorecard with a strong engine, a
// deferred paid channel and a channel nobody checked.
import type { EvidenceBundle } from "../src/index.js";
import type { ChannelScore } from "../src/analyze/scorecard.js";
import type { CommunityAudit } from "../src/sources/communities.js";

const row = (channel: string, status: ChannelScore["status"], strength: ChannelScore["strength"], signal: string, evidence: string[]): ChannelScore => ({
  channel: channel as ChannelScore["channel"],
  status,
  strength,
  signal,
  evidence,
});

export function audit(over: Partial<CommunityAudit> & { subreddit: string }): CommunityAudit {
  return {
    url: `https://www.reddit.com/r/${over.subreddit}/`,
    measured: {
      subreddit: over.subreddit,
      posts: 25,
      windowDays: 5,
      postsPerDay: 5,
      pctLinks: 0.2,
      pctQuestion: 0.3,
      pctStory: 0.5,
      pctSelfPromo: 0.04,
      medianTitleWords: 9,
      topDomains: [{ domain: "example.com", n: 3 }],
      samples: [{ title: "I tracked my week for 30 days", url: "https://reddit.com/r/x/1", author: "u/a", hasLink: false }],
    },
    policies: [],
    score: 70,
    verdict: "channel",
    reasons: [],
    evidenceId: "E4",
    ...over,
  };
}

export function fixture(): EvidenceBundle {
  return {
    tool: { name: "reverse-engineering-distribution", version: "0.1.0" },
    harness: { version: "1", sha: "abc123abc123" },
    target: { input: "acme.com", kind: "website", url: "https://acme.com", domain: "acme.com", brand: "Acme" },
    generatedAt: "2026-10-20T19:00:00.000Z",
    brand: "Acme",
    discovered: { socials: { tiktok: "acme" }, people: [], appStoreIds: [], playIds: [], logos: [], founderHints: [] },
    scorecard: [
      row("organic_tiktok", "active", 3, "120,000 followers, 5.2 posts/week", ["E2"]),
      row("seo", "active", 3, "2400 indexed URLs, 1 programmatic family", ["E3"]),
      row("paid_meta", "active", 3, "40 active now, longest ran 120d", ["E2"]),
      row("organic_x", "unknown", 0, "Not checked", []),
      row("lifecycle", "unknown", 0, "No email tool visible", []),
    ],
    evidence: [
      { id: "E1", source: "website", kind: "observation", title: 'Homepage positioning: "Track anything"', url: "https://acme.com", observedAt: "2026-10-20T19:00:00.000Z", data: { h1: ["Track anything"] } },
      { id: "E2", source: "tiktok", kind: "observation", title: "TikTok @acme: 120,000 followers, 5.2 posts/week, median 40,000 views", url: "https://tiktok.com/@acme", observedAt: "2026-10-20T19:00:00.000Z", data: { followers: 120000, postsPerWeek: 5.2, medianViewsRecent: 40000, lastPostDaysAgo: 2 } },
      { id: "E3", source: "seo", kind: "observation", title: "Sitemap: 2400 URLs, 1 programmatic family", url: "https://acme.com/sitemap.xml", observedAt: "2026-10-20T19:00:00.000Z", data: { totalUrls: 2400, sections: [{ path: "/integrations", count: 800, programmatic: true }], blogPostsLast90d: 12 } },
      { id: "E4", source: "communities", kind: "observation", title: "Community r/openlane: 25 posts in 5d, 20% link posts", url: "https://www.reddit.com/r/openlane/new/", observedAt: "2026-10-20T19:00:00.000Z", data: { verdict: "channel" } },
      { id: "E5", source: "communities", kind: "observation", title: "Community r/storiesonly: 40 posts in 4d, 2% link posts", url: "https://www.reddit.com/r/storiesonly/new/", observedAt: "2026-10-20T19:00:00.000Z", data: { verdict: "mine" } },
      { id: "E6", source: "communities", kind: "observation", title: "Community r/closedsub: 30 posts in 5d", url: "https://www.reddit.com/r/closedsub/new/", observedAt: "2026-10-20T19:00:00.000Z", data: { verdict: "closed" } },
    ],
    unknowns: [{ channel: "organic_x", reason: "SCRAPECREATORS_API_KEY not set", manualCheck: "https://x.com/search?q=acme" }],
    sources: [{ source: "website", status: "ok", ms: 120 }],
    credits: { scrapecreators: null },
    content: [{ id: "tiktok:1", platform: "tiktok", kind: "video", url: "https://tiktok.com/@acme/video/1", title: "POV: you finally track your week", metrics: { views: 900000 }, evidence: "E2" }],
    communities: [
      audit({ subreddit: "openlane", verdict: "channel", score: 78, reasons: ["20% of their posts carry an external link"], policies: [{ class: "link_rules", quote: "Link posts allowed once per week" }] }),
      audit({ subreddit: "storiesonly", verdict: "mine", score: 30, reasons: ["2% of posts carry a link: story format"], evidenceId: "E5", measured: { subreddit: "storiesonly", posts: 40, windowDays: 4, postsPerDay: 10, pctLinks: 0.02, pctQuestion: 0.1, pctStory: 0.8, pctSelfPromo: 0, medianTitleWords: 11, topDomains: [], samples: [] } }),
      audit({ subreddit: "closedsub", verdict: "closed", score: 0, reasons: ['rules forbid apps/self-promotion: "No apps, no self promotion"'], policies: [{ class: "apps_promo", quote: "No apps, no self promotion" }], evidenceId: "E6" }),
    ],
    identity: { logos: [], founders: [] },
  };
}
