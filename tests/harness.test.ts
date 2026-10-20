import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadHarness, playbook, systemPrompt } from "../src/harness.js";

describe("harness bundle", () => {
  const h = loadHarness();

  it("loads every file listed in the manifest and hashes the bundle", () => {
    expect(h.version).toBe("1");
    expect(h.sha).toMatch(/^[0-9a-f]{12}$/);
    expect(Object.keys(h.files)).toHaveLength(13);
    for (const f of ["system.md", "guardrails.md", "report-template.md", "lessons.md"]) expect(h.files[f]).toBeTruthy();
  });

  it("ships one playbook per distribution surface", () => {
    const names = Object.keys(h.files).filter(f => f.startsWith("playbooks/")).map(f => f.slice(10, -3));
    expect(names.sort()).toEqual([
      "affiliate-referral",
      "app-store-aso",
      "communities-reddit",
      "launches",
      "offer-funnel",
      "organic-short-form",
      "paid-amplification",
      "seo-geo",
      "x-founders",
    ]);
  });

  it("builds the system prompt in the order the model needs it", () => {
    const prompt = systemPrompt(h);
    expect(prompt.indexOf("# Role")).toBeLessThan(prompt.indexOf("Evidence rules"));
    expect(prompt.indexOf("Evidence rules")).toBeLessThan(prompt.indexOf("# Report format"));
    expect(prompt).toContain("# Channel playbooks");
    expect(prompt).toContain("A community we did not read the rules of is unknown, not open");
  });

  it("returns a playbook by name and null for a name it does not have", () => {
    expect(playbook(h, "communities-reddit")).toContain("mine");
    expect(playbook(h, "nope")).toBeNull();
  });

  it("fails loudly when the manifest lists a file that is not there", () => {
    const dir = mkdtempSync(join(tmpdir(), "red-harness-"));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ version: "9", files: ["system.md", "missing.md"] }));
    writeFileSync(join(dir, "system.md"), "# Role");
    expect(() => loadHarness(dir)).toThrow(/missing files: .*missing\.md/);
  });

  it("refuses to load a directory with no manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "red-harness-"));
    expect(() => loadHarness(dir)).toThrow(/manifest not found/);
  });
});
