import { describe, expect, it } from "vitest";
import { distributionPlan, renderPlan } from "../src/analyze/plan.js";
import { audit, fixture } from "./helpers.js";

describe("distribution plan", () => {
  const bundle = fixture();
  const plan = distributionPlan(bundle);

  it("starts with the baseline, before any posting", () => {
    expect(plan.week[0]).toMatchObject({ channel: "measurement" });
    expect(plan.week[0]!.when).toContain("day 0");
  });

  it("turns a mine into language work and never into a post", () => {
    const mining = plan.week.find(s => s.action.includes("Mine r/storiesonly"));
    expect(mining).toBeDefined();
    expect(mining!.action).toContain("Do not post there");
    expect(plan.week.some(s => s.channel === "communities (posting)" && s.action.includes("storiesonly"))).toBe(false);
  });

  it("schedules a post in the community whose rules allow it", () => {
    const posting = plan.week.find(s => s.channel === "communities (posting)");
    expect(posting?.action).toContain("r/openlane");
    expect(posting?.why).toContain("link_rules");
  });

  it("keeps closed communities in a do-not-retry list with the rule", () => {
    expect(plan.closed).toEqual(expect.arrayContaining([expect.objectContaining({ where: "r/closedsub" })]));
    expect(plan.closed.find(c => c.where === "r/closedsub")?.reason).toContain("No apps, no self promotion");
  });

  it("puts communities with unread rules in unconfirmed, not in closed", () => {
    const b = fixture();
    b.communities = [...b.communities, audit({ subreddit: "unread", verdict: "unknown", score: 50, reasons: ["no rules were read"] })];
    const p = distributionPlan(b);
    expect(p.unconfirmed.map(u => u.where)).toContain("r/unread");
    expect(p.closed.map(c => c.where)).not.toContain("r/unread");
    expect(renderPlan(p)).toContain("## Unconfirmed (rules not read: do not post until checked)");
  });

  it("copies the observed engine with a cadence taken from the evidence", () => {
    const shortform = plan.week.find(s => s.channel === "organic_tiktok");
    expect(shortform?.action).toContain("Publish 6 short-form videos a week");
    expect(shortform?.action).toContain("POV: you finally track your week");
    expect(shortform?.evidence).toContain("E2");
  });

  it("copies the page family instead of a blog habit", () => {
    const seo = plan.month.find(s => s.channel === "seo");
    expect(seo?.action).toContain("/integrations");
    expect(seo?.action).toContain("first 20 pages");
  });

  it("does not buy reach before there is a winning artifact", () => {
    const paid = plan.month.find(s => s.channel === "paid_meta");
    expect(paid?.action).toContain("Do not buy this channel yet");
  });

  it("never plans a channel that was not observed", () => {
    expect(plan.week.concat(plan.month).some(s => s.channel === "organic_x")).toBe(false);
    expect(plan.playable).not.toContain("organic_x");
  });

  it("closes the loop with a settle step", () => {
    const last = plan.month[plan.month.length - 1]!;
    expect(last.when).toBe("day 30");
    expect(last.action).toContain("Re-run the same teardown");
  });

  it("only cites evidence ids that exist in the bundle", () => {
    const ids = new Set(bundle.evidence.map(e => e.id));
    const cited = plan.week.concat(plan.month).flatMap(s => s.evidence);
    expect(cited.filter(id => !ids.has(id))).toEqual([]);
  });

  it("is deterministic: same bundle, same plan", () => {
    expect(distributionPlan(fixture())).toEqual(plan);
  });

  it("renders the two horizons and the closed list", () => {
    const md = renderPlan(plan);
    expect(md).toContain("## First 7 days");
    expect(md).toContain("## Days 8–30");
    expect(md).toContain("## Closed (do not retry without a rule change)");
    expect(md).toContain("[E2]");
  });
});
