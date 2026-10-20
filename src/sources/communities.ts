// Communities: can we actually distribute in this place, or is it only a source
// of language? Two things decide it, and neither is a vibe:
//   1. what the community itself publishes (links? questions? stories? promo?)
//   2. what its rules forbid (apps/promo, AI-written text, identity, account age)
// A community with the pain and a rule against apps is a mine, not a channel.
// Everything here is public: the anonymous Atom feed and rules the operator pasted.
import { parse } from "node-html-parser";
import type { Ctx } from "../context.js";
import { cached, clip, fetchText } from "../http.js";

const UA =
  process.env.RED_USER_AGENT ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

export interface CommunityPost {
  id: string;
  title: string;
  author: string;
  published: string;
  url: string;
  /** Post body as plain text (empty for link posts). */
  text: string;
  hasLink: boolean;
  domains: string[];
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Reddit's anonymous Atom feed: /r/<sub>/new/.rss. Also accepts any Atom feed. */
export function parseFeed(xml: string): CommunityPost[] {
  if (!xml || !/<feed[\s>]/i.test(xml)) return [];
  const root = parse(xml);
  const entries = root.querySelectorAll("entry");
  const out: CommunityPost[] = [];
  for (const entry of entries) {
    const link = entry.querySelector("link")?.getAttribute("href") ?? "";
    const title = decode((entry.querySelector("title")?.text ?? "").trim());
    const author = decode((entry.querySelector("author name")?.text ?? "").trim());
    const published = (entry.querySelector("published")?.text ?? entry.querySelector("updated")?.text ?? "").trim();
    const rawContent = entry.querySelector("content")?.text ?? "";
    const body = parse(decode(rawContent));
    const text = decode(body.text.replace(/\s+/g, " ").trim());
    const hrefs = body.querySelectorAll("a[href]").map(a => a.getAttribute("href") ?? "").filter(h => /^https?:\/\//i.test(h));
    const domains = [...new Set(hrefs.map(h => {
      try {
        return new URL(h).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        return "";
      }
    }).filter(d => d && d !== "reddit.com" && !d.endsWith(".reddit.com") && d !== "redd.it"))];
    if (!title && !link) continue;
    out.push({ id: (entry.querySelector("id")?.text ?? link).trim(), title, author, published, url: link, text, hasLink: domains.length > 0, domains });
  }
  return out;
}

export interface CommunityMeasurement {
  subreddit: string;
  posts: number;
  windowDays: number;
  postsPerDay: number | null;
  /** Share of posts that link to an external site (0–1). A sub near 0 is a story sub. */
  pctLinks: number | null;
  pctQuestion: number | null;
  /** First-person narrative ("I did X for 30 days"): the pain is told, not sold. */
  pctStory: number | null;
  /** Posts that promote the author's own product. */
  pctSelfPromo: number | null;
  medianTitleWords: number | null;
  topDomains: { domain: string; n: number }[];
  samples: { title: string; url: string; author: string; hasLink: boolean }[];
}

const QUESTION = /^(?:how|what|why|which|when|where|who|does|do|is|are|can|should|any(?:one|body))\b|\?\s*$/i;
const STORY = /\b(?:i|we)\s+(?:have been|'ve been|am|was|just|finally|tried|started|built|made|spent|used|stopped|quit|been)\b|\bmy \d+[- ](?:day|week|month|year)\b|\bday \d+ of\b/i;
const SELF_PROMO = /\b(?:i|we) (?:just )?(?:built|made|created|launched|developed|shipped)\b|\bmy (?:app|startup|tool|side ?project|product|saas)\b|\b(?:link|check (?:it|this)) out\b|\bfeedback (?:on|wanted)\b/i;
const ratio = (n: number, total: number) => (total ? Math.round((n / total) * 100) / 100 : null);

export function measure(posts: CommunityPost[], subreddit: string, now = Date.now()): CommunityMeasurement {
  const times = posts.map(p => Date.parse(p.published)).filter(t => Number.isFinite(t));
  // A feed of the 25 newest posts can span an hour: that is not a cadence, it is a sample.
  const span = times.length ? Math.max(0, (now - Math.min(...times)) / 86_400_000) : 0;
  const windowDays = Math.round(span * 10) / 10;
  const domainCounts: Record<string, number> = {};
  for (const p of posts) for (const d of p.domains) domainCounts[d] = (domainCounts[d] ?? 0) + 1;
  const titleWords = posts.map(p => p.title.split(/\s+/).filter(Boolean).length).sort((a, b) => a - b);
  return {
    subreddit: subreddit.replace(/^\/?r\//i, ""),
    posts: posts.length,
    windowDays,
    postsPerDay: span >= 1 ? Math.round((posts.length / span) * 100) / 100 : null,
    pctLinks: ratio(posts.filter(p => p.hasLink).length, posts.length),
    pctQuestion: ratio(posts.filter(p => QUESTION.test(p.title)).length, posts.length),
    pctStory: ratio(posts.filter(p => STORY.test(p.title) || STORY.test(p.text.slice(0, 400))).length, posts.length),
    pctSelfPromo: ratio(posts.filter(p => SELF_PROMO.test(p.title) || SELF_PROMO.test(p.text.slice(0, 400))).length, posts.length),
    medianTitleWords: titleWords.length ? titleWords[Math.floor(titleWords.length / 2)]! : null,
    topDomains: Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([domain, n]) => ({ domain, n })),
    samples: [...posts].slice(0, 5).map(p => ({ title: clip(p.title, 120), url: p.url, author: p.author, hasLink: p.hasLink })),
  };
}

export type PolicyClass = "apps_promo" | "ai_content" | "identity" | "karma_gate" | "link_rules";

export interface Policy {
  class: PolicyClass;
  quote: string;
}

/** Rules can't be fetched from a datacenter IP; the operator pastes them and we classify them. */
const RULES: { class: PolicyClass; re: RegExp }[] = [
  { class: "apps_promo", re: /\bno\s+(?:app|apps|self[-\s]?promo(?:tion)?|advertis\w*|promot\w*|marketing|solicit\w*|surveys?)\b|self[-\s]?promotion|\bstealth marketing\b|no (?:product|company) (?:posts?|mentions?)|promotional (?:posts?|content)/i },
  { class: "ai_content", re: /\bai[-\s]?generated\b|\bgenerated by ai\b|\bwritten by (?:ai|chatgpt|an? llm)\b|\bchatgpt\b|\bllm\b|even if it is just for translation/i },
  { class: "identity", re: /\bmust not identify primarily as\b|\b(?:no|not for) (?:founders|companies|marketers|business owners)\b|\bonly (?:patients|students|people with)\b/i },
  { class: "karma_gate", re: /\baccount (?:must be|at least|older than)\b[^.]{0,60}(?:\d+)[^.]{0,20}(?:days?|karma)|\b(?:minimum|min\.?) (?:karma|account age)\b|\bkarma (?:of|>=|≥)?\s?\d+/i },
  { class: "link_rules", re: /\blink (?:posts?|submissions?)\b|\bno (?:external )?links?\b|\bself[-\s]?posts?\b[^.]{0,40}\b(?:limit|only|allowed|not)\b/i },
];

export function classifyRules(text: string): Policy[] {
  const found: Policy[] = [];
  for (const line of text.split(/\n+/)) {
    for (const { class: cls, re } of RULES) {
      if (found.some(f => f.class === cls)) continue;
      const m = line.match(re);
      if (m) found.push({ class: cls, quote: clip(line.trim(), 220) });
    }
  }
  return found;
}

export function karmaGate(policies: Policy[]): { minDays?: number; minKarma?: number } {
  const gate = policies.find(p => p.class === "karma_gate");
  if (!gate) return {};
  const days = gate.quote.match(/(\d+)\s*days?/i)?.[1];
  const karma = gate.quote.match(/(\d+)\s*karma|karma[^0-9]{0,6}(\d+)/i);
  const minKarma = karma ? Number(karma[1] ?? karma[2]) : undefined;
  return { minDays: days ? Number(days) : undefined, minKarma: Number.isFinite(minKarma) ? minKarma : undefined };
}

export type Verdict = "channel" | "mine" | "gated" | "closed" | "unknown";

export interface CommunityAudit {
  subreddit: string;
  url: string;
  measured: CommunityMeasurement | null;
  policies: Policy[];
  /** 0–100: how usable this community is for distributing a product. */
  score: number;
  verdict: Verdict;
  reasons: string[];
  evidenceId?: string;
}

/**
 * A channel verdict needs evidence that links survive there: the community's own
 * posts carry links. Under 8% link posts, a product post is foreign to the format.
 * Rules override measurement: apps/promo or AI-content bans close it, an account-age
 * gate makes it unavailable to a new account, and no rules read means "unknown".
 */
export function judge(measured: CommunityMeasurement | null, policies: Policy[]): { score: number; verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const has = (c: PolicyClass) => policies.some(p => p.class === c);
  if (has("apps_promo")) {
    reasons.push(`rules forbid apps/self-promotion: "${policies.find(p => p.class === "apps_promo")!.quote}"`);
    return { score: 0, verdict: "closed", reasons };
  }
  if (has("ai_content")) {
    reasons.push(`rules forbid AI-generated text: "${policies.find(p => p.class === "ai_content")!.quote}"`);
    return { score: 0, verdict: "closed", reasons };
  }
  if (has("identity")) {
    reasons.push(`rules exclude the identity we would post as: "${policies.find(p => p.class === "identity")!.quote}"`);
    return { score: 0, verdict: "closed", reasons };
  }
  const gate = karmaGate(policies);
  if (gate.minDays || gate.minKarma) {
    reasons.push(`account gate: ${[gate.minDays ? `${gate.minDays} days old` : "", gate.minKarma ? `${gate.minKarma} karma` : ""].filter(Boolean).join(" + ")} — unavailable to a fresh account`);
  }
  if (!policies.length) reasons.push("no rules read: the channel is unknown, not open");
  if (!measured || measured.posts < 5) {
    reasons.push(`only ${measured?.posts ?? 0} posts in the sample: not enough to judge the format`);
    return { score: gate.minDays || gate.minKarma ? 15 : 0, verdict: gate.minDays || gate.minKarma ? "gated" : "unknown", reasons };
  }
  const links = measured.pctLinks ?? 0;
  const promo = measured.pctSelfPromo ?? 0;
  const cadence = measured.postsPerDay ?? 0;
  const linkBand = links >= 0.2 ? 45 : links >= 0.08 ? 35 : links >= 0.03 ? 15 : 0;
  const cadenceBand = cadence >= 10 ? 25 : cadence >= 2 ? 20 : cadence >= 0.5 ? 12 : 5;
  const formatBand = (measured.pctQuestion ?? 0) >= 0.2 ? 10 : 0;
  const promoBand = promo >= 0.02 ? 20 : promo > 0 ? 10 : 0;
  const score = Math.min(100, linkBand + cadenceBand + formatBand + promoBand);
  reasons.push(`${measured.posts} posts in ${measured.windowDays}d (${cadence ? `${cadence}/day` : "cadence unknown: the feed spans less than a day"}); ${Math.round(links * 100)}% carry an external link, ${Math.round(promo * 100)}% are self-promo, ${Math.round((measured.pctQuestion ?? 0) * 100)}% are questions`);
  if (gate.minDays || gate.minKarma) return { score: Math.min(score, 40), verdict: "gated", reasons };
  if (links >= 0.08) {
    // The format hosts links, but "it looks open" is not "the rules allow it".
    if (!policies.length) {
      reasons.push("the format hosts links, but no rules were read: unknown until a moderator or the sidebar confirms it");
      return { score: Math.min(score, 50), verdict: "unknown", reasons };
    }
    return { score, verdict: "channel", reasons };
  }
  reasons.push("the format is story/question posts without links: use it as a language mine, not a posting channel");
  return { score, verdict: "mine", reasons };
}

/** Sub names from "r/productivity, productivity, /r/ADHD". */
export function parseSubs(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,\s]+/);
  return [...new Set(raw.map(s => s.trim().replace(/^\/?r\//i, "").replace(/[^A-Za-z0-9_]/g, "")).filter(s => s.length >= 2))].slice(0, 12);
}

export function feedUrl(sub: string): string {
  return `https://www.reddit.com/r/${sub}/new/.rss`;
}

/** Rules the operator pasted, keyed by sub: { productivity: "1. No self promotion…" }. */
export function parseRulesFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const blocks = text.split(/^==+\s*(?:r\/)?([A-Za-z0-9_]+)\s*==+$/gim);
  for (let i = 1; i < blocks.length; i += 2) out[blocks[i]!.trim()] = blocks[i + 1]!.trim();
  return out;
}

/**
 * Reddit answers 429 to a second anonymous request, so this collector is deliberately
 * slow: one request per community, spaced by RED_REDDIT_DELAY_MS (60s default) unless
 * the feed is already in the 24h cache. Tests never touch this function.
 */
export async function collectCommunities(ctx: Ctx): Promise<void> {
  const subs = parseSubs(ctx.communities ?? []);
  if (!subs.length) {
    ctx.store.unknown({
      channel: "community",
      reason: "No communities given — pass --communities r/a,r/b to audit where this product can actually be distributed",
      manualCheck: "https://www.reddit.com/subreddits/search",
    });
    return;
  }
  const delay = Number(process.env.RED_REDDIT_DELAY_MS ?? 60_000);
  for (const [i, sub] of subs.entries()) {
    if (i > 0 && !process.env.RED_NO_CACHE) await new Promise(r => setTimeout(r, delay));
    const xml = await cached(`reddit:feed:${sub}`, async () => {
      const res = await fetchText(feedUrl(sub), { headers: { "user-agent": UA, accept: "application/atom+xml,application/xml" }, timeoutMs: 20_000 });
      if (res.status === 429) throw new Error("Reddit rate limit (429) on the anonymous feed — retry in a minute or add cookies");
      if (res.status >= 400) throw new Error(`Reddit feed returned HTTP ${res.status}`);
      return res.body;
    }).catch(err => {
      ctx.store.unknown({ channel: "community", reason: `r/${sub}: ${err instanceof Error ? err.message : String(err)}`, manualCheck: `https://www.reddit.com/r/${sub}/new/` });
      return null;
    });
    if (!xml) continue;
    const posts = parseFeed(xml);
    const measured = measure(posts, sub);
    const rulesText = ctx.communityRules?.[sub] ?? ctx.communityRules?.[sub.toLowerCase()] ?? "";
    const policies = classifyRules(rulesText);
    const { score, verdict, reasons } = judge(measured, policies);
    const ev = ctx.store.add({
      source: "communities",
      kind: "observation",
      title: `Community r/${measured.subreddit}: ${measured.posts} posts in ${measured.windowDays}d, ${Math.round((measured.pctLinks ?? 0) * 100)}% link posts, ${Math.round((measured.pctSelfPromo ?? 0) * 100)}% self-promo`,
      url: `https://www.reddit.com/r/${measured.subreddit}/new/`,
      data: { measured, policies, score, verdict, reasons, sample: measured.samples },
    });
    ctx.audits.push({ subreddit: measured.subreddit, url: `https://www.reddit.com/r/${measured.subreddit}/`, measured, policies, score, verdict, reasons, evidenceId: ev.id });
  }
  if (!ctx.audits.length) ctx.store.unknown({ channel: "community", reason: "Community feeds could not be read", manualCheck: "https://www.reddit.com/subreddits/search" });
}
