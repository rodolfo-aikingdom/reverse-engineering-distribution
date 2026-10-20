import { scorecard, type ChannelScore } from "./analyze/scorecard.js";
import { runSource, skip, type Ctx } from "./context.js";
import { EvidenceStore, type ContentItem, type Evidence, type SourceRun, type Unknown } from "./evidence.js";
import { loadHarness } from "./harness.js";
import { collectAppleAds } from "./sources/apple-ads.js";
import { collectCommunities, type CommunityAudit } from "./sources/communities.js";
import { collectAppStore, collectHackerNews, collectWayback } from "./sources/free.js";
import { collectPaid } from "./sources/paid.js";
import type { LogoCandidate } from "./sources/html.js";
import { rankLogos } from "./sources/identity.js";
import { collectCommunity, collectFounders, mergeFounders, type Founder } from "./sources/people.js";
import { scrapeCreatorsFromEnv } from "./sources/scrapecreators.js";
import { collectSeo } from "./sources/seo.js";
import { collectSocial } from "./sources/social.js";
import { collectWebsite } from "./sources/website.js";
import { parseTarget, type Target } from "./target.js";

export type Area = "website" | "seo" | "history" | "apps" | "paid" | "social" | "founders" | "community" | "communities";
export const AREAS: Area[] = ["website", "seo", "history", "apps", "paid", "social", "founders", "community", "communities"];

/** runSource labels that belong to each area (for stage error reporting). */
const RUN_LABELS: Record<Area, string[]> = {
  website: ["website"],
  seo: ["seo"],
  history: ["wayback"],
  apps: ["appstore", "apple_ads", "hackernews"],
  paid: ["paid"],
  social: ["social"],
  founders: ["founders"],
  community: ["community"],
  communities: ["communities"],
};

export interface RunOptions {
  /** Limit to some areas (website always runs: it discovers handles for the rest). */
  only?: Area[];
  maxCredits?: number;
  /** Override discovered handles, e.g. { tiktok: "notionhq" }. */
  handles?: Ctx["found"]["socials"];
  /** Communities to audit for distribution fit (subreddit names). */
  communities?: string[];
  /** Rules the operator pasted, keyed by subreddit. They cannot be fetched from a datacenter IP. */
  communityRules?: Record<string, string>;
  log?: (msg: string) => void;
  /** Structured progress for UIs: website first, then the areas in parallel. */
  onStage?: (stage: "website" | Area, state: "start" | "done" | "error", detail?: string) => void;
}

export interface EvidenceBundle {
  tool: { name: "reverse-engineering-distribution"; version: string };
  harness: { version: string; sha: string };
  target: Target;
  generatedAt: string;
  brand: string;
  discovered: Ctx["found"];
  scorecard: ChannelScore[];
  evidence: Evidence[];
  unknowns: Unknown[];
  sources: SourceRun[];
  credits: { scrapecreators: number | null };
  /** Posts, videos, ads and threads to review (not sent to the LLM). */
  content: ContentItem[];
  /** Community audits: can this product be distributed there, or is it only language? */
  communities: CommunityAudit[];
  /** Brand logo (best first, UI falls through on load errors) and ranked founders. */
  identity: { logo?: string; logos: LogoCandidate[]; founders: Founder[] };
}

export const VERSION = "0.1.0";

export async function reverseEngineer(input: string, opts: RunOptions = {}): Promise<EvidenceBundle> {
  const target = parseTarget(input);
  const store = new EvidenceStore();
  const sc = scrapeCreatorsFromEnv(opts.maxCredits ?? Number(process.env.RED_MAX_CREDITS ?? 50));
  const log = opts.log ?? (() => {});
  const ctx: Ctx = {
    target,
    store,
    sc,
    log,
    content: [],
    communities: opts.communities,
    communityRules: opts.communityRules,
    audits: [],
    found: { socials: { ...opts.handles }, people: [], appStoreIds: [], playIds: [], logos: [], founderHints: [] },
  };
  const want = (a: Area) => !opts.only?.length || opts.only.includes(a);
  const stage = opts.onStage ?? (() => {});
  const timed = async (name: "website" | Area, labels: string[], fn: () => Promise<void>) => {
    stage(name, "start");
    const before = store.runs.length;
    await fn();
    const failed = store.runs.slice(before).filter(r => r.status === "error" && labels.includes(r.source));
    stage(name, failed.length ? "error" : "done", failed.map(f => f.reason).join("; ") || undefined);
  };

  // App-store links: resolve the developer website first, then scan it like any site.
  if (target.kind !== "website") {
    log("→ app store");
    await timed("apps", ["appstore"], () => runSource(ctx, "appstore", collectAppStore));
  }
  if (target.url) {
    log(`→ website ${target.url}`);
    await timed("website", ["website"], () => runSource(ctx, "website", collectWebsite));
  } else skip(ctx, "website", "no website found for this app");

  const jobs: [Area, string, () => Promise<void>][] = [
    ["seo", "seo", () => runSource(ctx, "seo", collectSeo)],
    ["history", "wayback", () => runSource(ctx, "wayback", collectWayback)],
    ["apps", "appstore + apple search ads + hacker news", async () => {
      if (target.kind === "website") await runSource(ctx, "appstore", collectAppStore);
      await Promise.all([runSource(ctx, "apple_ads", collectAppleAds), runSource(ctx, "hackernews", collectHackerNews)]);
    }],
    ["paid", "ad libraries", () => runSource(ctx, "paid", collectPaid)],
    ["social", "social accounts", () => runSource(ctx, "social", collectSocial)],
    ["founders", "founders", () => runSource(ctx, "founders", collectFounders)],
    ["community", "community", () => runSource(ctx, "community", collectCommunity)],
    ["communities", "communities", () => runSource(ctx, "communities", collectCommunities)],
  ];
  await Promise.all(
    jobs.filter(([a]) => want(a) && (target.url || a === "communities")).map(([area, label, fn]) => {
      log(`→ ${label}`);
      return timed(area, RUN_LABELS[area], fn);
    }),
  );

  const harness = loadHarness();
  const logos = rankLogos(ctx.found.logos, target.domain);
  return {
    tool: { name: "reverse-engineering-distribution", version: VERSION },
    harness: { version: harness.version, sha: harness.sha },
    target,
    generatedAt: new Date().toISOString(),
    brand: ctx.found.brandName ?? target.brand ?? target.domain ?? input,
    discovered: ctx.found,
    scorecard: scorecard(store),
    evidence: store.items,
    unknowns: store.unknowns,
    sources: store.runs,
    credits: { scrapecreators: sc ? sc.spent : null },
    content: ctx.content,
    communities: ctx.audits,
    identity: {
      logo: logos[0]?.url,
      logos,
      founders: (store.bySource("founders")[0]?.data as Founder[] | undefined) ?? mergeFounders(ctx.found.founderHints),
    },
  };
}

export { parseTarget } from "./target.js";
export { renderMarkdown } from "./report/markdown.js";
export { synthesize } from "./analyze/synthesize.js";
export { validateReport } from "./report/validate.js";
export { distributionPlan, renderPlan } from "./analyze/plan.js";
export { judge, measure, classifyRules, parseFeed, parseSubs } from "./sources/communities.js";
export type { CommunityAudit, CommunityMeasurement, Policy, Verdict } from "./sources/communities.js";
export type { ChannelScore } from "./analyze/scorecard.js";
export type { Evidence, Unknown } from "./evidence.js";
