import { describe, expect, it } from "vitest";
import {
  classifyRules,
  judge,
  karmaGate,
  measure,
  parseFeed,
  parseRulesFile,
  parseSubs,
  type CommunityPost,
  type CommunityMeasurement,
} from "../src/sources/communities.js";

const ATOM = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <category term="example" label="r/example"/>
  <entry>
    <id>t3_aaa</id>
    <title>How do you track a week without an app?</title>
    <link href="https://www.reddit.com/r/example/comments/aaa/how_do_you/" />
    <author><name>/u/someone</name></author>
    <published>2026-10-18T10:00:00+00:00</published>
    <content type="html">&lt;div class="md"&gt;&lt;p&gt;I have been trying this for 30 days and I still fail. &lt;a href="https://example.com/tool?utm_source=reddit"&gt;this&lt;/a&gt;&lt;/p&gt;&lt;/div&gt;</content>
  </entry>
  <entry>
    <id>t3_bbb</id>
    <title>I quit my job to build a tracker</title>
    <link href="https://www.reddit.com/r/example/comments/bbb/quit/" />
    <author><name>/u/founder</name></author>
    <published>2026-10-19T09:00:00+00:00</published>
    <content type="html">&lt;p&gt;No links here, just the story of the last six months.&lt;/p&gt;</content>
  </entry>
</feed>`;

const post = (over: Partial<CommunityPost>): CommunityPost => ({
  id: "t3_x",
  title: "a title",
  author: "u/a",
  published: "2026-10-18T00:00:00+00:00",
  url: "https://www.reddit.com/r/example/comments/x/",
  text: "",
  hasLink: false,
  domains: [],
  ...over,
});

describe("community feed parsing", () => {
  it("reads titles, authors, dates and external links out of Atom", () => {
    const posts = parseFeed(ATOM);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({ id: "t3_aaa", author: "/u/someone", hasLink: true, domains: ["example.com"] });
    expect(posts[0]!.text).toContain("I have been trying this for 30 days");
    expect(posts[1]).toMatchObject({ hasLink: false, domains: [] });
  });

  it("treats a non-feed body as nothing instead of throwing", () => {
    expect(parseFeed("<html><body>blocked</body></html>")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
  });
});

describe("community measurement", () => {
  const posts: CommunityPost[] = [
    post({ title: "How do I track a week?", published: "2026-10-17T00:00:00+00:00" }),
    post({ title: "I tracked my week for 30 days", published: "2026-10-18T00:00:00+00:00", text: "I tried this and it worked", hasLink: true, domains: ["a.com"] }),
    post({ title: "My app is live", published: "2026-10-19T00:00:00+00:00", text: "I built an app for this", hasLink: true, domains: ["b.com", "a.com"] }),
    post({ title: "unrelated", published: "2026-10-20T00:00:00+00:00" }),
  ];
  const now = Date.parse("2026-10-20T00:00:00+00:00");

  it("computes cadence, link share, questions, stories and promo share", () => {
    const m = measure(posts, "r/example", now);
    expect(m).toMatchObject({ subreddit: "example", posts: 4, windowDays: 3, postsPerDay: 1.33, pctLinks: 0.5, pctQuestion: 0.25 });
    expect(m.pctStory).toBeGreaterThan(0);
    expect(m.pctSelfPromo).toBeGreaterThan(0);
    expect(m.topDomains[0]).toEqual({ domain: "a.com", n: 2 });
    expect(m.samples).toHaveLength(4);
  });

  it("returns nulls instead of guessing on an empty sample", () => {
    const m = measure([], "empty", now);
    expect(m).toMatchObject({ posts: 0, windowDays: 0, postsPerDay: null, pctLinks: null });
  });
});

describe("community rules", () => {
  const RULES = `1. No self promotion, no app promotion and no stealth marketing.
2. Posts must not be AI-generated, even if it is just for translation.
3. Account must be at least 30 days old and have 50 karma to post.
4. Link posts are allowed once per week, on Fridays.`;

  it("classifies the four rule classes that close or gate a channel", () => {
    const policies = classifyRules(RULES);
    expect(policies.map(p => p.class).sort()).toEqual(["ai_content", "apps_promo", "karma_gate", "link_rules"]);
    expect(policies.find(p => p.class === "apps_promo")?.quote).toContain("No self promotion");
  });

  it("reads the account gate into numbers", () => {
    expect(karmaGate(classifyRules(RULES))).toEqual({ minDays: 30, minKarma: 50 });
    expect(karmaGate(classifyRules("Be nice."))).toEqual({});
  });

  it("parses the pasted rules file by subreddit block", () => {
    const parsed = parseRulesFile("== r/productivity ==\nNo self promotion.\n\n== r/ADHD ==\nNo apps.\n");
    expect(Object.keys(parsed)).toEqual(["productivity", "ADHD"]);
    expect(parsed.ADHD).toContain("No apps");
  });

  it("normalizes subreddit lists", () => {
    expect(parseSubs("r/productivity, /r/ADHD, productivity, x")).toEqual(["productivity", "ADHD"]);
  });
});

describe("where we can play", () => {
  const measured = (over: Partial<CommunityMeasurement> = {}): CommunityMeasurement => ({
    subreddit: "example",
    posts: 25,
    windowDays: 5,
    postsPerDay: 5,
    pctLinks: 0.2,
    pctQuestion: 0.3,
    pctStory: 0.5,
    pctSelfPromo: 0.04,
    medianTitleWords: 9,
    topDomains: [],
    samples: [],
    ...over,
  });
  const linksOk = [{ class: "link_rules" as const, quote: "Link posts are allowed once per week." }];

  it("closes a channel when the rules forbid apps or self-promotion", () => {
    const v = judge(measured(), [{ class: "apps_promo", quote: "No apps, no self promotion." }]);
    expect(v.verdict).toBe("closed");
    expect(v.score).toBe(0);
    expect(v.reasons[0]).toContain("forbid apps");
  });

  it("closes a channel when AI-written text is banned", () => {
    expect(judge(measured(), [{ class: "ai_content", quote: "No AI-generated content." }]).verdict).toBe("closed");
  });

  it("closes a channel that excludes our identity", () => {
    expect(judge(measured(), [{ class: "identity", quote: "Must not identify primarily as a founder." }]).verdict).toBe("closed");
  });

  it("turns an account gate into a date, not a workaround", () => {
    const v = judge(measured(), [{ class: "karma_gate", quote: "Account must be at least 30 days old and have 50 karma." }]);
    expect(v.verdict).toBe("gated");
    expect(v.reasons.join(" ")).toContain("30 days old");
  });

  it("calls it a mine when the format has no links", () => {
    const v = judge(measured({ pctLinks: 0.02 }), linksOk);
    expect(v.verdict).toBe("mine");
    expect(v.reasons.join(" ")).toContain("language mine");
  });

  it("refuses to call a community open when its rules were never read", () => {
    const v = judge(measured(), []);
    expect(v.verdict).toBe("unknown");
    expect(v.reasons.join(" ")).toContain("no rules were read");
  });

  it("calls it a channel when links are native and the rules allow them", () => {
    const v = judge(measured(), linksOk);
    expect(v.score).toBeGreaterThan(60);
    expect(v.verdict).toBe("channel");
  });

  it("does not judge a sample smaller than five posts", () => {
    expect(judge(measured({ posts: 2 }), linksOk).verdict).toBe("unknown");
  });
});
