import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as store from "../static/js/progressStore.js";
import { normalise, esc } from "../static/js/ui.js";
import {
  renderLiterature,
  renderText,
  renderReader,
  recallPrompts,
} from "../static/js/literature.js";
import {
  renderLibrary,
  renderLanguage,
  renderGrammar,
  renderVocabulary,
  renderExercise,
  renderSearch,
  filterItems,
} from "../static/js/libraries.js";
import { renderDashboard } from "../static/js/dashboard.js";
const catalog = JSON.parse(
  readFileSync(new URL("../data/content/catalog.json", import.meta.url)),
);
function storage() {
  const s = {};
  Object.defineProperties(s, {
    getItem: { value: (k) => s[k] ?? null },
    setItem: {
      value: (k, v) => {
        s[k] = String(v);
      },
    },
  });
  return s;
}
globalThis.localStorage = storage();
const context = (c = catalog, params = "") => ({
  c,
  reader: { scope: "section", cursor: 0, revealed: false },
  params: new URLSearchParams(params),
  greekSize: 23,
});

test("Unicode search handles polytonic accents, decomposition and final sigma", () => {
  assert.equal(normalise("Ἄργος"), normalise("αργοσ"));
  assert.equal(normalise("Ὀρέστης"), normalise("ορεστης"));
  assert.equal(normalise("ἄνθρωπος".normalize("NFD")), normalise("ανθρωπος"));
  assert.ok(
    filterItems(
      catalog,
      catalog.sections,
      new URLSearchParams("q=αργος"),
      "sections",
    ).some((s) => s.id === "electra-1"),
  );
});
test("original progress is migrated once, preserving original records and key", () => {
  globalThis.localStorage = storage();
  const legacy = {
    electra: {
      1: {
        started: true,
        perfectTests: 2,
        essay12Plus: 1,
        weakSentences: ["τὸ γὰρ"],
      },
    },
    herodotus: { 207: { started: true } },
  };
  localStorage.setItem("greekRevisionProgress", JSON.stringify(legacy));
  store.migrateLegacy();
  assert.deepEqual(
    store.getEntry("sections", "electra-1").legacy,
    legacy.electra[1],
  );
  assert.equal(
    localStorage.getItem("greekRevisionProgress"),
    JSON.stringify(legacy),
  );
  store.setEntry("sections", "electra-1", { completed: true });
  store.migrateLegacy();
  assert.equal(store.getEntry("sections", "electra-1").completed, true);
  assert.equal(store.getEntry("sections", "herodotus-207").started, true);
});
test("independent text, chunk, practice and essay drafts survive updates", () => {
  globalThis.localStorage = storage();
  store.setEntry("sections", "electra-1", { plan: "Outline", draft: "Essay" });
  store.setEntry("sections", "herodotus-207", { completed: true });
  store.setEntry("units", "herodotus-207:p1", { draft: "Recall" });
  store.setEntry("unseen", "demo-unseen-001", { draft: "Translation" });
  store.setEntry("compositions", "demo-composition-001", { draft: "Greek" });
  store.toggle("sections", "electra-1", "bookmarked");
  assert.equal(store.getEntry("sections", "electra-1").draft, "Essay");
  assert.equal(store.getEntry("units", "herodotus-207:p1").draft, "Recall");
  assert.equal(
    store.getEntry("unseen", "demo-unseen-001").draft,
    "Translation",
  );
  assert.equal(
    store.getEntry("compositions", "demo-composition-001").draft,
    "Greek",
  );
});
test("progress restore is additive and older records cannot overwrite newer drafts", () => {
  globalThis.localStorage = storage();
  store.setEntry("sections", "electra-1", { draft: "Keep latest" });
  store.setEntry("grammar", "demo-cases", { completed: true });
  const backup = {
    format: "greeklabs-progress",
    version: 2,
    entries: [
      {
        kind: "sections",
        id: "electra-1",
        schema_version: 2,
        updatedAt: "2000-01-01T00:00:00Z",
        draft: "Old",
      },
      {
        kind: "sections",
        id: "herodotus-207",
        schema_version: 2,
        updatedAt: "2026-01-01T00:00:00Z",
        completed: true,
      },
    ],
  };
  assert.equal(store.importProgress(backup), 1);
  assert.equal(store.getEntry("sections", "electra-1").draft, "Keep latest");
  assert.equal(store.getEntry("grammar", "demo-cases").completed, true);
  assert.ok(store.exportProgress().recovery.length);
  const before = JSON.stringify(store.exportProgress().entries);
  assert.throws(() =>
    store.importProgress({
      ...backup,
      entries: [backup.entries[1], { id: "bad" }],
    }),
  );
  assert.equal(JSON.stringify(store.exportProgress().entries), before);
});
test("future-version records and corrupt originals are preserved", () => {
  globalThis.localStorage = storage();
  localStorage.setItem(
    "greekLabs:v2:entry:sections:electra-1",
    JSON.stringify({ schema_version: 3, draft: "Newer format" }),
  );
  store.setEntry("sections", "electra-1", { draft: "Do not overwrite" });
  assert.equal(store.getEntry("sections", "electra-1").draft, "Newer format");
  localStorage.setItem("greekLabs:v2:entry:sections:electra-2", "broken JSON");
  store.setEntry("sections", "electra-2", { started: true });
  assert.ok(
    store
      .exportProgress()
      .recovery.some((r) => r.value.includes("broken JSON")),
  );
});
test("all supplied and empty views render without fabricated content", () => {
  globalThis.localStorage = storage();
  const ctx = context();
  const outputs = [
    renderLiterature(catalog),
    ...catalog.texts.map((t) => renderText(catalog, t.id)),
    renderLanguage(ctx),
    renderGrammar(ctx, "demo-participles"),
    renderVocabulary(ctx),
    renderLibrary(ctx, "unseen"),
    renderLibrary(ctx, "compositions"),
    renderExercise(ctx, "unseen", "demo-unseen-001"),
    renderExercise(ctx, "compositions", "demo-composition-001"),
    renderDashboard(ctx),
    renderSearch(ctx),
  ];
  for (const s of catalog.sections) {
    for (const mode of ["learn", "revision", "style", "essay"])
      outputs.push(renderReader(context(), s.id, mode));
  }
  assert.ok(
    outputs.every(
      (s) => typeof s === "string" && !s.includes("[object Object]"),
    ),
  );
  assert.match(renderText(catalog, "odyssey-22"), /awaiting import/);
  assert.match(
    renderExercise(ctx, "unseen", "demo-unseen-001"),
    /not verified educational material/,
  );
  assert.match(renderReader(ctx, "electra-1", "learn"), /O child of Agamemnon/);
  assert.match(
    renderReader(ctx, "electra-1", "style"),
    /have not been supplied/,
  );
});
test("imported annotation, question, grammar exercises and models render escaped", () => {
  const c = structuredClone(catalog);
  c.annotations.push({
    id: "fixture-note",
    section_id: "electra-1",
    status: "sample",
    quote: "<img src=x onerror=alert(1)>",
    technique: "Fixture technique",
    effect: "Fixture effect",
    context: "Fixture context",
    reference: "1",
  });
  c.questions.push({
    id: "fixture-question",
    title: "Fixture title",
    question: "Fixture question",
    text_id: "electra",
    section_ids: ["electra-1"],
    status: "sample",
    reference: "1",
    quotations: ["Fixture quote"],
    points: ["Fixture point"],
    guidance: "Fixture guidance",
  });
  c.grammar[0].examples = [
    { greek: "Fixture Greek", english: "Fixture English" },
  ];
  c.grammar[0].exercises = [
    {
      id: "stable-exercise-id",
      prompt: "Fixture prompt",
      answer: "Fixture answer",
    },
  ];
  c.unseen[0].greek = "Fixture passage";
  c.unseen[0].translation = "Fixture translation";
  c.unseen[0].glosses = [{ greek: "word", english: "meaning" }];
  c.compositions[0].english = "Fixture English";
  c.compositions[0].model_greek = "Fixture model";
  c.compositions[0].alternatives = ["Fixture alternative"];
  const ctx = context(c),
    style = renderReader(ctx, "electra-1", "style");
  assert.ok(!style.includes("<img"));
  assert.match(style, /&lt;img/);
  assert.match(renderReader(ctx, "electra-1", "essay"), /Fixture guidance/);
  assert.match(
    renderGrammar(ctx, "demo-participles"),
    /exercise_stable-exercise-id/,
  );
  assert.match(
    renderExercise(ctx, "unseen", "demo-unseen-001"),
    /Fixture translation/,
  );
  assert.match(
    renderExercise(ctx, "compositions", "demo-composition-001"),
    /Fixture alternative/,
  );
});
test("recall reveals one matching subsection, handles difficulty bank and clamps cursor", () => {
  globalThis.localStorage = storage();
  const ctx = context(),
    section = catalog.sections.find((s) => s.id === "herodotus-209");
  assert.equal(recallPrompts(ctx, section).length, 5);
  let html = renderReader(ctx, section.id, "revision");
  assert.ok(!html.includes(section.units[0].translation));
  ctx.reader.revealed = true;
  html = renderReader(ctx, section.id, "revision");
  assert.ok(html.includes(esc(section.units[0].translation)));
  assert.ok(!html.includes(esc(section.units[1].translation)));
  ctx.reader.scope = "difficult";
  assert.equal(recallPrompts(ctx, section).length, 0);
  store.setEntry("units", "herodotus-209:p2", { confidence: "difficult" });
  assert.equal(recallPrompts(ctx, section).length, 1);
  ctx.reader.cursor = 999;
  renderReader(ctx, section.id, "revision");
  assert.equal(ctx.reader.cursor, 0);
});
test("library filters and pagination scale to 200 passages per library", () => {
  globalThis.localStorage = storage();
  const c = structuredClone(catalog);
  for (const kind of ["unseen", "compositions"])
    c[kind] = Array.from({ length: 200 }, (_, i) => ({
      ...c[kind][0],
      id: `fixture-${kind}-${i + 1}`,
      number: i + 1,
      title: `Fixture ${i + 1}`,
      difficulty: i % 2 ? "advanced" : "foundation",
    }));
  for (const kind of ["unseen", "compositions"]) {
    const html = renderLibrary(context(c), kind);
    assert.equal((html.match(/class="library-row"/g) || []).length, 12);
    assert.match(html, /Page 1 of 17/);
    assert.equal(
      filterItems(c, c[kind], new URLSearchParams("difficulty=advanced"), kind)
        .length,
      100,
    );
    store.setEntry(kind, c[kind][0].id, { bookmarked: true, completed: true });
    assert.equal(
      filterItems(
        c,
        c[kind],
        new URLSearchParams("bookmarked=1&status=completed"),
        kind,
      ).length,
      1,
    );
    assert.match(renderLibrary(context(c, "page=17"), kind), /Page 17 of 17/);
  }
});
test("storage failure uses memory and remains exportable", () => {
  globalThis.localStorage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  };
  store.setEntry("sections", "quota-fixture", { draft: "Do not lose this" });
  assert.equal(
    store.getEntry("sections", "quota-fixture").draft,
    "Do not lose this",
  );
  assert.ok(
    store.exportProgress().entries.some((e) => e.id === "quota-fixture"),
  );
  assert.ok(store.storageWarning());
});

test('line bookmarks make their parent section searchable, and legacy starts are not new', () => {
  globalThis.localStorage = storage();
  store.setEntry('lines', 'electra-1:l1', {bookmarked:true});
  assert.equal(filterItems(catalog, catalog.sections, new URLSearchParams('bookmarked=1'), 'sections')[0].id, 'electra-1');
  store.setEntry('sections', 'herodotus-207', {started:true});
  assert.ok(!filterItems(catalog, catalog.sections, new URLSearchParams('status=new'), 'sections').some(s=>s.id==='herodotus-207'));
});
