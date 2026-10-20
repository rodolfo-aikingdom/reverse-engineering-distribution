import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { distributionPlan, renderPlan } from "./analyze/plan.js";
import { synthesize } from "./analyze/synthesize.js";
import { loadHarness, playbook } from "./harness.js";
import { AREAS, reverseEngineer, VERSION, type EvidenceBundle } from "./index.js";
import { communityTable, renderMarkdown, scorecardTable } from "./report/markdown.js";
import { validateReport } from "./report/validate.js";
import { loadRun as loadSavedRun, saveRun } from "./runs.js";
import { parseSubs } from "./sources/communities.js";

async function loadRun(id: string): Promise<EvidenceBundle> {
  try {
    return await loadSavedRun(id);
  } catch {
    throw new Error(`Unknown run_id "${id}". Call reverse_engineer_distribution first.`);
  }
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

export function createServer(): McpServer {
  const server = new McpServer({ name: "reverse-engineering-distribution", version: VERSION });

  server.registerTool(
    "reverse_engineer_distribution",
    {
      title: "Reverse engineer how a product is distributed",
      description:
        "Collect public evidence of how a company gets its product in front of people from one link (website, App Store or Google Play URL): organic short-form and social cadence and hooks, SEO (sitemaps, programmatic families, AI-crawler stance), founders, Reddit/HN/Product Hunt, pricing/funnel, App Store, pixels, homepage history, and optionally an audit of named communities (does the format host links? do the rules allow a product post?) so you can tell a posting channel from a language mine. Returns a deterministic channel scorecard, community verdicts, an evidence index (ids + titles + URLs) and unknowns. Use get_evidence for details and get_playbook for the method, then write the report citing [E#] ids.",
      inputSchema: {
        url: z.string().describe("Website domain/URL, App Store URL or Google Play URL"),
        only: z.array(z.enum(AREAS as [string, ...string[]])).optional().describe(`Limit to areas: ${AREAS.join(", ")}. Website always runs.`),
        handles: z.record(z.string(), z.string()).optional().describe('Override discovered handles, e.g. {"tiktok":"notionhq","x":"NotionHQ"}'),
        communities: z.array(z.string()).optional().describe('Subreddits to audit, e.g. ["productivity","ADHD"]. One public feed request each, spaced 60s apart.'),
        community_rules: z.record(z.string(), z.string()).optional().describe('Rules text per subreddit, pasted by the operator (Reddit blocks rules reads from here). Without them a community can be "mine" but never "open".'),
        max_credits: z.number().int().min(0).max(500).optional().describe("Scrape Creators credit budget (default 50)"),
      },
    },
    async ({ url, only, handles, communities, community_rules, max_credits }) => {
      const bundle = await reverseEngineer(url, {
        only: only as any,
        handles: handles as any,
        communities: communities ? parseSubs(communities) : undefined,
        communityRules: community_rules,
        maxCredits: max_credits,
      });
      const { id, path } = await saveRun(bundle);
      return text(
        [
          `# ${bundle.brand} — evidence collected (run_id: ${id})`,
          `${bundle.evidence.length} evidence items · ${(bundle.content ?? []).length} posts/videos/ads (get_content) · ${bundle.communities.length} communities audited · ${bundle.unknowns.length} unknowns · ${bundle.credits.scrapecreators ?? 0} Scrape Creators credits · harness v${bundle.harness.version} (${bundle.harness.sha}) · full bundle: ${path}`,
          "",
          "## Channel scorecard (deterministic)",
          scorecardTable(bundle.scorecard),
          "",
          ...(bundle.communities.length ? ["## Where we can play (deterministic)", communityTable(bundle.communities), "", ...bundle.communities.map(a => `- r/${a.subreddit}: ${a.verdict} — ${a.reasons.join("; ")}`), ""] : []),
          "## Evidence index",
          ...bundle.evidence.map(e => `- [${e.id}] (${e.source}) ${e.title}${e.url ? ` — ${e.url}` : ""}`),
          "",
          "## Unknowns",
          ...(bundle.unknowns.length ? bundle.unknowns.map(u => `- ${u.channel}: ${u.reason}${u.manualCheck ? ` → ${u.manualCheck}` : ""}`) : ["- none"]),
          "",
          "Next: call get_evidence (run_id, ids) for the items you quote, get_playbook for the method and report format, write the report citing [E#], then validate_report. get_distribution_plan gives the deterministic 7/30-day plan to compare your report against.",
        ].join("\n"),
      );
    },
  );

  server.registerTool(
    "get_evidence",
    {
      title: "Get evidence details",
      description: "Full data for evidence items from a run: top posts and hooks, community measurements and rules, sitemap page families, founders, pricing signals, pixels. Filter by ids or source.",
      inputSchema: {
        run_id: z.string(),
        ids: z.array(z.string()).optional().describe('Evidence ids like ["E3","E7"]. Omit for all.'),
        source: z.string().optional().describe("Filter by source, e.g. seo, communities, founders"),
      },
    },
    async ({ run_id, ids, source }) => {
      const bundle = await loadRun(run_id);
      const items = bundle.evidence.filter(e => (!ids?.length || ids.includes(e.id)) && (!source || e.source === source));
      return text(JSON.stringify(items, null, 1));
    },
  );

  server.registerTool(
    "get_content",
    {
      title: "Get posts, videos and ads",
      description: "Concrete items to quote or show the user: TikTok and Instagram videos/posts, YouTube videos, X and LinkedIn posts (company + founders), Reddit threads and brand/founder replies, and ads when a Scrape Creators key is configured. Each item links to the original.",
      inputSchema: {
        run_id: z.string(),
        platform: z.enum(["meta_ads", "google_ads", "linkedin_ads", "apple_ads", "tiktok", "instagram", "youtube", "x", "linkedin", "reddit"]).optional(),
        sort: z.enum(["top", "newest", "longest_running"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ run_id, platform, sort, limit }) => {
      const bundle = await loadRun(run_id);
      const score = (c: any) => c.metrics?.views ?? c.metrics?.likes ?? c.metrics?.score ?? c.metrics?.runningDays ?? 0;
      let items = (bundle.content ?? []).filter(c => !platform || c.platform === platform);
      if (sort === "newest") items = [...items].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
      else if (sort === "longest_running") items = [...items].sort((a, b) => (b.metrics?.runningDays ?? 0) - (a.metrics?.runningDays ?? 0));
      else if (sort === "top") items = [...items].sort((a, b) => score(b) - score(a));
      return text(JSON.stringify(items.slice(0, limit ?? 30), null, 1));
    },
  );

  server.registerTool(
    "get_distribution_plan",
    {
      title: "Get the deterministic distribution plan",
      description: "The 7-day and 30-day plan computed from the evidence, no LLM: which channel to copy first with what cadence, which communities we can post in, which are mines, which are closed and why, and the day-0 measurement and day-30 settle. Use it as the skeleton of your report; adapt the wording, never the evidence.",
      inputSchema: { run_id: z.string(), json: z.boolean().optional().describe("Return the plan object instead of the rendered markdown") },
    },
    async ({ run_id, json }) => {
      const plan = distributionPlan(await loadRun(run_id));
      return text(json ? JSON.stringify(plan, null, 1) : renderPlan(plan));
    },
  );

  server.registerTool(
    "get_playbook",
    {
      title: "Get the analysis playbook",
      description:
        "The RED harness: distribution-analyst role, evidence rules, report template and lesson library (default), or one channel playbook: communities-reddit, organic-short-form, x-founders, seo-geo, launches, app-store-aso, paid-amplification, affiliate-referral, offer-funnel.",
      inputSchema: { name: z.string().optional() },
    },
    async ({ name }) => {
      const h = loadHarness();
      if (name) {
        const body = playbook(h, name);
        if (!body) throw new Error(`No playbook "${name}". Available: ${Object.keys(h.files).filter(f => f.startsWith("playbooks/")).map(f => f.slice(10, -3)).join(", ")}`);
        return text(body);
      }
      return text([h.files["system.md"], h.files["guardrails.md"], h.files["report-template.md"], h.files["lessons.md"]].join("\n\n---\n\n"));
    },
  );

  server.registerTool(
    "validate_report",
    {
      title: "Validate a report",
      description: "Check a written report against a run: citations resolve, required sections exist, TL;DR and plan steps are grounded in evidence, no invented ad spend, every audited community got a verdict, unknowns reported.",
      inputSchema: { run_id: z.string(), markdown: z.string() },
    },
    async ({ run_id, markdown }) => text(JSON.stringify(validateReport(markdown, await loadRun(run_id)), null, 1)),
  );

  server.registerTool(
    "write_report",
    {
      title: "Write the report server-side",
      description: "Optional: have RED write the distribution report itself with Claude (needs ANTHROPIC_API_KEY in the MCP server env). Without a key, returns the deterministic evidence report.",
      inputSchema: { run_id: z.string(), model: z.string().optional() },
    },
    async ({ run_id, model }) => {
      const bundle = await loadRun(run_id);
      if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return text(renderMarkdown(bundle));
      const res = await synthesize(bundle, { model });
      return text(renderMarkdown(bundle, { narrative: res.markdown }));
    },
  );

  server.registerTool(
    "compare_runs",
    {
      title: "What changed since last time",
      description: "Diff two saved runs of the same company: follower and cadence movement, sitemap growth, channel status changes, homepage repositioning, and which posts/ads are new or no longer seen. Pass a domain to diff its two latest runs, or two run_ids.",
      inputSchema: { domain: z.string().optional(), run_a: z.string().optional(), run_b: z.string().optional() },
    },
    async ({ domain, run_a, run_b }) => {
      const { diffRuns, renderDiff } = await import("./report/diff.js");
      const { runsForDomain, resolveRun } = await import("./runs.js");
      let a: EvidenceBundle;
      let b: EvidenceBundle;
      if (run_a && run_b) [a, b] = [await resolveRun(run_a), await resolveRun(run_b)];
      else if (domain) {
        const runs = await runsForDomain(domain);
        if (runs.length < 2) throw new Error(`Need two saved runs of ${domain} (found ${runs.length}). Call reverse_engineer_distribution again later, then compare.`);
        [a, b] = [await resolveRun(runs[1]!.id), await resolveRun(runs[0]!.id)];
      } else throw new Error("Pass a domain, or run_a and run_b");
      return text(renderDiff(diffRuns(a, b)));
    },
  );

  // Guided workflows (REA-style named prompts): one click in clients that surface MCP prompts.
  const prompt = (name: string, title: string, description: string, args: Record<string, z.ZodString | z.ZodOptional<z.ZodString>>, body: (a: Record<string, string | undefined>) => string) =>
    server.registerPrompt(name, { title, description, argsSchema: args }, a => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: body(a as Record<string, string | undefined>) } }] }));

  prompt("investigate_distribution", "Investigate a product's distribution", "Full teardown: evidence, community verdicts, cited report, validated.", { url: z.string(), communities: z.string().optional().describe("comma-separated subreddits") }, ({ url, communities }) =>
    `Reverse engineer how ${url} gets distributed. 1) Call reverse_engineer_distribution({url: "${url}"${communities ? `, communities: "${communities}".split(",")` : ""}}). 2) Call get_playbook() and follow its report template and evidence rules. 3) Use get_evidence and get_content for the items you quote. 4) Call get_distribution_plan and use it as the skeleton of the Distribution plan section. 5) Write the report citing [E#] for every fact; label inferences "Likely". 6) Call validate_report and fix anything that fails before answering.`);

  prompt("where_can_we_play", "Where can this product be distributed", "Turn community audits into a go/no-go list with the rule or the measurement behind each verdict.", { run_id: z.string() }, ({ run_id }) =>
    `For run ${run_id}: read the communities in the bundle with get_evidence (source "communities"). For each one give the verdict (channel, mine, gated, closed, unknown), the rule quote or measurement that decided it, and what we would post there in that community's own format. Then list the surfaces outside communities (search, launches, store, affiliate, paid) with the same verdict logic, and say which single surface we should start with and why.`);

  prompt("steal_the_distribution", "Steal the distribution (spec → build)", "Investigate → spec → build: turn their distribution machine into our 30-day plan with real assets.", { url: z.string(), my_product: z.string().optional() }, ({ url, my_product }) =>
    `Investigate → spec → build → verify, for distribution. 1) Investigate ${url} (reverse_engineer_distribution + get_playbook + get_content + get_distribution_plan). 2) Spec: their machine as a spec (surfaces, cadence, hooks, offer, page templates) with [E#] citations. 3) Build for ${my_product ?? "my product"}: 5 hooks adapted (never copied), 3 short-form video briefs, the community posts we can actually make (with the rule that allows each), a landing page outline, and a 30-day calendar. 4) Verify: the baseline to record on day 0 and the numbers that settle it on day 30. Clean-room rule: copy the strategy and structure, never their exact copy, footage or brand.`);

  prompt("what_changed", "What changed since last time", "Re-run and diff against the previous run.", { url: z.string() }, ({ url }) =>
    `Run reverse_engineer_distribution({url: "${url}"}), then compare_runs({domain: "${url}"}). Explain what changed: new hooks, killed ads, cadence up or down, new page families, repositioning. Say what each change suggests (label inferences) and what to watch next week.`);

  prompt("audit_unknowns", "Audit unknowns", "List what RED could not see for a run and exactly how to check each by hand.", { run_id: z.string() }, ({ run_id }) =>
    `For run ${run_id}: call get_evidence and read the unknowns. For each unknown channel, explain why it is unknown, how much it matters for distribution, and the fastest manual check (use the manualCheck links). Then list which inputs (a handle, community rules, an app id, an API key) would close the most important gaps.`);

  return server;
}

export async function startMcp(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
