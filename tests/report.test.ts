import { describe, expect, it } from "vitest";
import { renderMarkdown, communityTable } from "../src/report/markdown.js";
import { validateReport } from "../src/report/validate.js";
import { fixture } from "./helpers.js";

const GOOD = `# How Acme gets distributed

**One-line verdict:** short-form hooks feeding a free tool, with search compounding behind it.

## TL;DR
- Short-form is the input: 120,000 followers at 5.2 posts a week, and the top hook is a first-person skit [E2].
- Search is the multiplier: 2,400 URLs and one programmatic family of 800 pages [E3].
- r/openlane hosts link posts and its rules allow one a week, so it is the only community we can post in [E4].
- The other two communities are a language mine and a closed door, which is a different kind of finding [E5, E6].

## Channel scorecard
| Channel | Status | Strength | What we saw | Evidence |
|---|---|---|---|---|
| Organic · TikTok | active | ●●● | 120,000 followers, 5.2 posts/week | [E2] |

## The engine
The loop is organic to paid: the same hooks that win on TikTok get budget later, and the search family catches the demand they create [E2, E3].

## Where we can play
- **r/openlane** — channel: 20% of their posts carry links and the rules allow one link post a week [E4].
- **r/storiesonly** — mine: 2% of posts carry links, so the format is stories, not products [E5].
- **r/closedsub** — closed: the rules forbid apps and self-promotion [E6].
- **Search** — channel: the page family is a template we can rebuild with our own data [E3].

## Distribution plan
1. Day 0: record followers, posts/week, signups and source per day before posting anything [E2].
2. Day 1–2: mine r/storiesonly for 20 titles and 10 objections; do not post there [E5].
3. Day 3–5: post once in r/openlane in their format, one link at most [E4].
4. Day 2–7: publish 6 short-form videos a week built on the hook that already worked [E2].
5. Day 10–30: build the first 20 pages of the programmatic family with our own data [E3].
6. Day 30: re-run the teardown and kill the step that did not move a number [E2].

## Unknowns & how to check
- X was not checked because there is no key for it; check the account by hand.
`;

describe("deterministic report", () => {
  const bundle = fixture();

  it("renders the distribution sections, not the marketing ones", () => {
    const md = renderMarkdown(bundle);
    expect(md).toContain("# How Acme gets distributed");
    expect(md).toContain("## Channel scorecard");
    expect(md).toContain("## Where we can play");
    expect(md).toContain("## Distribution plan (deterministic)");
    expect(md).toContain("## Unknowns & how to check");
    expect(md).toContain("[E4]");
  });

  it("puts every audited community in a table with its verdict", () => {
    const table = communityTable(bundle.communities);
    expect(table).toContain("r/openlane");
    expect(table).toContain("channel (product posts are native)");
    expect(table).toContain("mine (language only, no posting)");
    expect(table).toContain("closed (rules forbid it)");
    expect(table.split("\n")).toHaveLength(5);
  });
});

describe("report validator", () => {
  const bundle = fixture();

  it("passes a grounded distribution report", () => {
    const v = validateReport(GOOD, bundle);
    expect(v.checks.filter(c => !c.ok)).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.score).toBe(1);
  });

  it("fails a dangling citation", () => {
    const v = validateReport(GOOD.replace("[E2].", "[E99]."), bundle);
    expect(v.ok).toBe(false);
    expect(v.checks.find(c => c.name === "citations resolve")?.detail).toContain("E99");
  });

  it("fails a report that drops an audited community", () => {
    const v = validateReport(GOOD.replaceAll("r/storiesonly", "some other place"), bundle);
    expect(v.checks.find(c => c.name === "communities judged")).toMatchObject({ ok: false });
    expect(v.checks.find(c => c.name === "communities judged")?.detail).toContain("r/storiesonly");
  });

  it("fails a plan with no grounded steps", () => {
    const v = validateReport(GOOD.replace(/^(\d\. .*?) \[E\d+\]/gm, "$1"), bundle);
    expect(v.checks.find(c => c.name === "plan grounded")?.ok).toBe(false);
  });

  it("fails invented ad spend", () => {
    const v = validateReport(`${GOOD}\nThey spend $50k/month in ad spend.\n`, bundle);
    expect(v.checks.find(c => c.name === "no invented spend")?.ok).toBe(false);
  });

  it("requires the distribution sections", () => {
    const v = validateReport(GOOD.replace("## Where we can play", "## Communities"), bundle);
    expect(v.checks.find(c => c.name === "required sections")?.detail).toContain("Where we can play");
  });
});
