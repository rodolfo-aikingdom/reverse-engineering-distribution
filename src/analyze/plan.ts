// The distribution plan: deterministic, no LLM. It reads what was observed and
// turns it into the next 7 and 30 days, in the order that costs the least and
// teaches the most. Every step cites the evidence it is copied from, and a
// channel we could not observe never becomes a step — "not checked" is not "do it".
import type { EvidenceBundle } from "../index.js";
import { clip } from "../http.js";
import type { CommunityAudit } from "../sources/communities.js";
import { engines, type ChannelScore } from "./scorecard.js";

export interface PlanStep {
  n: number;
  when: string;
  channel: string;
  action: string;
  why: string;
  evidence: string[];
}

export interface DistributionPlan {
  brand: string;
  generatedAt: string;
  harness: { version: string; sha: string };
  /** Channels that look like this company's engine, strongest first. */
  engines: ChannelScore[];
  /** Channels we can copy now (observed + not closed by a policy). */
  playable: string[];
  /** Places we cannot use, with the reason, so nobody tries twice. */
  closed: { where: string; reason: string }[];
  /** Places whose rules were never read: not open, not closed. */
  unconfirmed: { where: string; reason: string }[];
  week: PlanStep[];
  month: PlanStep[];
}

type Bundle = Pick<EvidenceBundle, "brand" | "generatedAt" | "harness" | "scorecard" | "evidence" | "communities" | "content" | "unknowns">;

const data = (b: Bundle, source: string) => b.evidence.find(e => e.source === source)?.data as any;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
const pct = (v: unknown) => (v == null ? "?" : `${Math.round(Number(v) * 100)}%`);

/** Best hooks we saw, quoted as published. Used only when the bundle has content. */
function topHooks(b: Bundle, platforms: string[], take = 3): { text: string; url: string; id?: string }[] {
  return [...(b.content ?? [])]
    .filter(c => platforms.includes(c.platform) && (c.title || c.text))
    .sort((x, y) => (y.metrics?.views ?? y.metrics?.likes ?? y.metrics?.score ?? 0) - (x.metrics?.views ?? x.metrics?.likes ?? x.metrics?.score ?? 0))
    .slice(0, take)
    .map(c => ({ text: clip(c.title || c.text, 90), url: c.url, id: c.evidence }));
}

function shortForm(b: Bundle, card: ChannelScore, ev: string[], out: PlanStep[], when: string): void {
  const moves = [
    ["tiktok", "organic_tiktok", "postsPerWeek"],
    ["instagram", "organic_instagram", "postsPerWeek"],
    ["youtube", "organic_youtube", "videosLast90d"],
  ] as const;
  for (const [source, channel, cadenceKey] of moves) {
    if (card.channel !== channel || card.strength < 1 || card.status === "unknown") continue;
    const d = data(b, source) ?? {};
    const cadence = n(d[cadenceKey]);
    const target = cadence ? Math.min(7, Math.max(3, Math.ceil(cadence))) : 3;
    const hooks = topHooks(b, [source]);
    out.push({
      n: out.length + 1,
      when,
      channel,
      action: `Publish ${target} short-form videos a week, each built on one hook that already worked for them${hooks.length ? `: ${hooks.map(h => `"${h.text}"`).join("; ")}` : ""}. One problem, one demo, one CTA.`,
      why: `Their cadence is ${cadence ?? "?"} per week at strength ${card.strength}/3; the hooks are quoted from their own top posts, so the format is proven in this category.`,
      evidence: [...ev, ...hooks.map(h => h.id).filter((x): x is string => Boolean(x))].slice(0, 6),
    });
    return;
  }
}

export function distributionPlan(b: Bundle): DistributionPlan {
  const card = b.scorecard ?? [];
  const by = (c: string) => card.find(x => x.channel === c);
  const playable: string[] = [];
  const closed: { where: string; reason: string }[] = [];
  const unconfirmed: { where: string; reason: string }[] = [];
  const week: PlanStep[] = [];
  const month: PlanStep[] = [];

  // 1. Baseline. Without it the settle is an opinion.
  const measurable = card.filter(c => c.status !== "unknown");
  if (measurable.length) {
    week.push({
      n: 1,
      when: "day 0 (before you post anything)",
      channel: "measurement",
      action: "Record the baseline: current followers, posts/week, signups and the channel each signup came from. One row per day, same fields, before the first post.",
      why: "A channel verdict without a before-number is a story. These are the channels that can be measured on day 0.",
      evidence: [...new Set(measurable.flatMap(c => c.evidence))].slice(0, 6),
    });
  }

  // 2. Communities: mines give language, channels give reach, the rest stay closed.
  const audits = b.communities ?? [];
  const channels = audits.filter(a => a.verdict === "channel");
  const mines = audits.filter(a => a.verdict === "mine");
  for (const a of audits) {
    if (a.verdict === "closed" || a.verdict === "gated") closed.push({ where: `r/${a.subreddit}`, reason: a.reasons.join("; ") });
    else if (a.verdict === "unknown") unconfirmed.push({ where: `r/${a.subreddit}`, reason: a.reasons.join("; ") || "no rules read" });
  }

  if (mines.length) {
    const list = mines.map(a => `r/${a.subreddit}`).join(", ");
    week.push({
      n: week.length + 1,
      when: "day 1–2",
      channel: "communities (language)",
      action: `Mine ${list} for the words of the problem: 20 thread titles that describe it, 10 objections, and the exact phrasing. Do not post there.`,
      why: `In those communities ${mines.map(a => `${Math.round((a.measured?.pctLinks ?? 0) * 100)}% of posts carry links`).join("/")} and the rules or the format do not host product posts; the value is the language.`,
      evidence: mines.map(a => a.evidenceId).filter((x): x is string => Boolean(x)),
    });
  }

  if (channels.length) {
    for (const a of channels.slice(0, 3)) {
      const best = a.measured?.samples?.[0];
      week.push({
        n: week.length + 1,
        when: "day 3–5",
        channel: "communities (posting)",
        action: `Post once in r/${a.subreddit} in the community's own format${best ? ` (their top format right now: "${best.title}")` : ""}: the result first, the product only if asked, one link at most.`,
        why: `${Math.round((a.measured?.pctLinks ?? 0) * 100)}% of their posts carry an external link and ${Math.round((a.measured?.pctSelfPromo ?? 0) * 100)}% are self-promo, so a product post is native there. Rules read: ${a.policies.length ? a.policies.map(p => p.class).join(", ") : "none — check with a moderator before posting"}.`,
        evidence: a.evidenceId ? [a.evidenceId] : [],
      });
    }
  }

  // 3. Copy the observed engine, channel by channel.
  const eng = engines(card);
  for (const c of eng) {
    if (["paid_meta", "paid_google", "paid_linkedin", "paid_apple", "paid_reddit", "paid_tiktok"].includes(c.channel)) {
      month.push({
        n: month.length + 1,
        when: "day 15–30",
        channel: c.channel,
        action: "Do not buy this channel yet. Take the 3 organic posts with the best numbers, run each as a paid variant, and keep only what beats the organic median.",
        why: `${c.channel} is strength ${c.strength}/3 for them (${c.signal}), which means they have winners they can afford to amplify. We do not have a winner to amplify yet.`,
        evidence: c.evidence.slice(0, 4),
      });
      continue;
    }
    if (c.channel === "seo") {
      const seo = data(b, "seo") ?? {};
      const fams = (seo.sections ?? []).filter((s: any) => s.programmatic) ?? [];
      const fam = fams[0];
      playable.push(c.channel);
      month.push({
        n: month.length + 1,
        when: "day 10–30",
        channel: c.channel,
        action: fam
          ? `Copy the programmatic page family /${fam.path} (${fam.count ?? "?"} pages, ${seo.totalUrls ?? "?"} total URLs): one template, real data per page, first 20 pages live.`
          : `Ship ${Math.max(6, Math.round(Number(seo.blogPostsLast90d ?? 6) / 3))} pages in 30 days on the problem queries they rank for, one template.`,
        why: fams.length
          ? `Their site runs ${fams.length} programmatic families over ${seo.totalUrls ?? "?"} URLs; that is a content machine, not a blog habit.`
          : `Their search surface is ${seo.totalUrls ?? "?"} URLs with ${seo.blogPostsLast90d ?? 0} updates in 90 days: a page-at-a-time asset, so the copy is a template plus a cadence, not a volume war.`,
        evidence: c.evidence.slice(0, 4),
      });
      continue;
    }
    if (c.channel === "geo") {
      playable.push(c.channel);
      month.push({
        n: month.length + 1,
        when: "day 20–30",
        channel: c.channel,
        action: "Publish llms.txt and keep AI crawlers allowed on the pages that carry the answer; put the definitive answer for the problem in one page, in plain text.",
        why: "Answer engines cite the page that answers the question directly; blocking them removes us from that surface.",
        evidence: c.evidence.slice(0, 3),
      });
      continue;
    }
    if (c.channel === "founder_led") {
      const fo = data(b, "founders");
      const who = Array.isArray(fo) ? fo.find((f: any) => f.postsRecently)?.name ?? fo[0]?.name : undefined;
      playable.push(c.channel);
      week.push({
        n: week.length + 1,
        when: "day 4–7",
        channel: c.channel,
        action: `Publish 3 posts from the ${who ? `${who} account` : "founder account"}: one number from the build, one mistake, one teardown. No announcement posts.`,
        why: `Founder-led distribution is strength ${c.strength}/3 for them (${c.signal}); the account is the asset, so the cadence has to be theirs.`,
        evidence: c.evidence.slice(0, 4),
      });
      continue;
    }
    if (c.channel === "launches") {
      playable.push(c.channel);
      month.push({
        n: month.length + 1,
        when: "day 7–21",
        channel: c.channel,
        action: "Prepare one launch with a real demo and a number in the title, then answer every comment for the first 4 hours. One launch, not three.",
        why: `Their launch surface is live (${c.signal}); launches compound only with the follow-up thread.`,
        evidence: c.evidence.slice(0, 3),
      });
      continue;
    }
    if (c.channel === "affiliate") {
      playable.push(c.channel);
      month.push({
        n: month.length + 1,
        when: "day 20–30",
        channel: c.channel,
        action: "Open a referral program at the same commission they publish, and give every affiliate the same 3 hooks that already convert.",
        why: `Affiliate is strength ${c.strength}/3 for them (${c.signal}); the asset is the hook library, not the percentage.`,
        evidence: c.evidence.slice(0, 3),
      });
      continue;
    }
    if (["organic_tiktok", "organic_instagram", "organic_youtube"].includes(c.channel)) {
      if (c.status === "unknown" || c.strength < 1) continue;
      playable.push(c.channel);
      shortForm(b, c, c.evidence.slice(0, 3), week, "day 2–7");
      continue;
    }
    if (c.channel === "reddit_marketing" || c.channel === "community") {
      // Reddit as a posting surface is decided by the community audits above, never by the scorecard alone.
      continue;
    }
    if (c.channel === "app_store") {
      playable.push(c.channel);
      month.push({
        n: month.length + 1,
        when: "day 5–15",
        channel: c.channel,
        action: "Rewrite the store listing around the hook that wins in their ads and screenshots: first line is the problem, not the feature list.",
        why: `The listing is a distribution surface with its own search; strength ${c.strength}/3 (${c.signal}).`,
        evidence: c.evidence.slice(0, 3),
      });
    }
  }

  // 4. Close the loop: the settle is part of the plan, not an afterthought.
  month.push({
    n: month.length + 1,
    when: "day 30",
    channel: "measurement",
    action: "Re-run the same teardown on this company and on us: what changed in each channel, which step moved a number, and kill the step that did not.",
    why: "The diff is the only thing that turns a copied playbook into a method; without it the plan is repeated forever.",
    evidence: [],
  });

  return {
    brand: b.brand,
    generatedAt: b.generatedAt,
    harness: b.harness,
    engines: eng,
    playable: [...new Set(playable)],
    closed,
    unconfirmed,
    week: week.map((s, i) => ({ ...s, n: i + 1 })),
    month: month.map((s, i) => ({ ...s, n: i + 1 })),
  };
}

export function renderPlan(plan: DistributionPlan): string {
  const step = (s: PlanStep) => `${s.n}. **${s.when} · ${s.channel}** — ${s.action}\n   - Why: ${s.why}${s.evidence.length ? `\n   - Evidence: ${s.evidence.map(e => `[${e}]`).join(" ")}` : ""}`;
  return [
    `# Distribution plan for ${plan.brand}`,
    "",
    plan.engines.length ? `**Engines observed:** ${plan.engines.map(e => `${e.channel} ${e.strength}/3`).join(" · ")}` : "**Engines observed:** none strong enough to copy",
    "",
    "## First 7 days",
    "",
    ...plan.week.map(step),
    "",
    "## Days 8–30",
    "",
    ...plan.month.map(step),
    ...(plan.closed.length ? ["", "## Closed (do not retry without a rule change)", "", ...plan.closed.map(c => `- **${c.where}**: ${c.reason}`)] : []),
    ...(plan.unconfirmed.length ? ["", "## Unconfirmed (rules not read: do not post until checked)", "", ...plan.unconfirmed.map(c => `- **${c.where}**: ${c.reason}`)] : []),
    "",
  ].join("\n");
}
