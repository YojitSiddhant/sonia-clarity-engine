import { describe, expect, it } from "vitest";
import { KNOWLEDGE, retrieve } from "../app/ask/knowledge";
import { CONNECTIONS } from "../app/engine/signals";

describe("knowledge base", () => {
  it("is built only from the curated app data, with unique ids", () => {
    const ids = KNOWLEDGE.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^(signal|pair|core|log):/.test(id))).toBe(true);
  });

  it("never includes open pairs, which have no source", () => {
    const open = CONNECTIONS.filter((c) => c.evidence === "open").map((c) => `pair:${c.pair[0]}+${c.pair[1]}`);
    expect(open.length).toBeGreaterThan(0);
    for (const id of open) expect(KNOWLEDGE.some((d) => d.id === id)).toBe(false);
  });

  it("keeps the editorial-reading label on interpretive pairs", () => {
    const interp = KNOWLEDGE.filter((d) => d.evidence === "interpretive");
    expect(interp.length).toBeGreaterThan(0);
    for (const d of interp) expect(d.reading).toBeTruthy();
  });

  it("excludes placeholder and conflicting metrics", () => {
    const all = KNOWLEDGE.map((d) => `${d.text} ${d.where ?? ""}`).join(" ");
    expect(all).not.toMatch(/\$X million|80% of delivery|1,200 new opportunities/);
  });
});

describe("retrieve", () => {
  it("returns nothing for off-topic questions", () => {
    expect(retrieve("What is her favourite food?")).toEqual([]);
    expect(retrieve("asdf qwerty")).toEqual([]);
  });

  it("returns a small, relevant set for topic questions", () => {
    const docs = retrieve("How does Sonia connect marketing and operations?");
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.length).toBeLessThanOrEqual(8);
    expect(docs.some((d) => d.id === "pair:brand+operations")).toBe(true);
  });

  it("answers year questions from dated records active in that period", () => {
    const docs = retrieve("What does her timeline show around 2020?");
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d.evidence === "record")).toBe(true);
  });

  it("returns a whole lane for lane questions", () => {
    expect(retrieve("What awards are listed in her profile?")).toHaveLength(10);
    expect(retrieve("Where did she volunteer?")).toHaveLength(3);
  });
});
