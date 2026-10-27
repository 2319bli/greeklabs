import {
  esc,
  icon,
  badge,
  empty,
  button,
  href,
  options,
  normalise,
} from "./ui.js";
import { allEntries, getEntry } from "./progressStore.js";
import { confidence } from "./literature.js";

export const routeFor = (kind, item) =>
  ({
    texts: `literature/${item.id}`,
    sections: `read/${item.id}/learn`,
    grammar: `grammar/${item.id}`,
    vocabulary: `vocabulary/${item.id}`,
    unseen: `unseen/${item.id}`,
    compositions: `composition/${item.id}`,
    annotations: `read/${item.section_id}/style`,
    questions: item.section_ids?.length
      ? `read/${item.section_ids[0]}/essay?question=${item.id}`
      : `literature/${item.text_id}`,
  })[kind];
export const topicLinks = (c, ids = []) =>
  ids
    .map((id) =>
      href(
        esc(c.grammar.find((g) => g.id === id)?.title || id),
        `grammar/${id}`,
        "topic-link",
      ),
    )
    .join("");
const statusMatches = (p, value) =>
  !value ||
  (value === "completed" && p.completed) ||
  (value === "started" &&
    (p.attempted || p.visitedAt || p.started) &&
    !p.completed) ||
  (value === "new" &&
    !p.completed &&
    !p.visitedAt &&
    !p.attempted &&
    !p.started);
export function filterItems(c, items, params, kind) {
  const query = normalise(params.get("q") || "").trim();
  const bookmarkedSections = new Set(
    params.get("bookmarked")
      ? allEntries()
          .filter((entry) => entry.bookmarked && ["lines", "units"].includes(entry.kind))
          .map((entry) => entry.id.split(":")[0])
      : [],
  );
  const values = (value) =>
    Array.isArray(value)
      ? value.map(values).join(" ")
      : value && typeof value === "object"
        ? Object.values(value).map(values).join(" ")
        : String(value ?? "");
  return items.filter((item) => {
    const k = item._kind || kind,
      t = c.texts.find((t) => t.id === item.text_id),
      p = getEntry(k, item.id);
    const searchable = normalise(
      values(item) +
        " " +
        (t ? `${t.title} ${t.author}` : "") +
        " " +
        (item.topic_ids || [])
          .map((id) => c.grammar.find((g) => g.id === id)?.title || id)
          .join(" "),
    );
    return (
      (!query || searchable.includes(query)) &&
      (!params.get("difficulty") ||
        item.difficulty === params.get("difficulty")) &&
      (!params.get("author") ||
        (item.author || t?.author) === params.get("author")) &&
      (!params.get("genre") ||
        (item.genre || t?.genre) === params.get("genre")) &&
      (!params.get("topic") ||
        item.topic_ids?.includes(params.get("topic")) ||
        item.id === params.get("topic")) &&
      (!params.get("text") ||
        item.text_id === params.get("text") ||
        (k === "texts" && item.id === params.get("text"))) &&
      (!params.get("content") || item.status === params.get("content")) &&
      statusMatches(p, params.get("status")) &&
      (!params.get("bookmarked") || p.bookmarked || (k === "sections" && bookmarkedSections.has(item.id)))
    );
  });
}
function filters(
  c,
  items,
  params,
  {
    searchLabel = "Search title, number or Greek…",
    authors = false,
    texts = false,
    genres = false,
    difficulty = true,
    topics = true,
  } = {},
) {
  const sel = (key, label, values) =>
    `<label>${label}<select id="filter-${key}" data-filter="${key}">${options(values, params.get(key), `All ${label.toLowerCase()}`)}</select></label>`;
  const authorList = [
    ...new Set(
      items
        .map((i) => i.author || c.texts.find((t) => t.id === i.text_id)?.author)
        .filter(Boolean),
    ),
  ].sort();
  const genreList = [
    ...new Set(
      items
        .map((i) => i.genre || c.texts.find((t) => t.id === i.text_id)?.genre)
        .filter(Boolean),
    ),
  ].sort();
  return `<form class="filters" id="filters" role="search"><label class="search-field">Search<input id="library-search" type="search" data-filter="q" value="${esc(params.get("q"))}" placeholder="${searchLabel}"></label>${
    texts
      ? sel(
          "text",
          "Set texts",
          c.texts.map((t) => [t.id, t.title]),
        )
      : ""
  }${authors ? sel("author", "Authors", authorList) : ""}${genres ? sel("genre", "Genres", genreList) : ""}${
    difficulty
      ? sel("difficulty", "Difficulties", [
          ["foundation", "Foundation"],
          ["developing", "Developing"],
          ["advanced", "Advanced"],
        ])
      : ""
  }${
    topics
      ? sel(
          "topic",
          "Grammar topics",
          c.grammar.map((t) => [t.id, t.title]),
        )
      : ""
  }${sel("status", "Progress", [
    ["new", "Not started"],
    ["started", "In progress"],
    ["completed", "Completed"],
  ])}${sel("content", "Content states", [
    ["published", "Published"],
    ["draft", "Incomplete"],
    ["sample", "Demonstrations"],
  ])}<label class="check-filter"><input id="filter-bookmarked" type="checkbox" data-filter="bookmarked" ${params.get("bookmarked") ? "checked" : ""}> Bookmarks</label><button type="button" class="filter-reset" data-action="reset-filters">Reset</button></form>`;
}
function pagination(items, params, size = 12) {
  const pages = Math.max(1, Math.ceil(items.length / size)),
    page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  return {
    items: items.slice((page - 1) * size, page * size),
    html:
      pages > 1
        ? `<nav class="pagination" aria-label="Results pages">${button(`${icon("back", 14)} Previous`, "page", `data-page="${page - 1}" ${page === 1 ? "disabled" : ""}`)}<span>Page ${page} of ${pages}</span>${button(`Next ${icon("arrow", 14)}`, "page", `data-page="${page + 1}" ${page === pages ? "disabled" : ""}`)}</nav>`
        : "",
  };
}
function sampleNotice() {
  return '<div class="notice sample">Demonstration entries show how this library works. They are not verified educational material. Your reviewed content will be imported later.</div>';
}
export function renderLibrary(ctx, kind) {
  const c = ctx.c,
    p = ctx.params,
    isUnseen = kind === "unseen",
    items = c[kind],
    filtered = filterItems(c, items, p, kind),
    page = pagination(filtered, p),
    title = isUnseen ? "Unseen translation" : "Prose composition",
    available = items.filter((i) => i.status === "published").length;
  return `<div class="page-heading"><div><h1>${title}</h1><p>${isUnseen ? "Greek to English" : "English to Greek · sentences and continuous prose"}</p></div><span class="tag">${icon(isUnseen ? "translate" : "pen", 14)} ${available} published exercises</span></div>${items.some((i) => i.status === "sample") ? sampleNotice() : ""}
 ${filters(c, items, p, { authors: isUnseen, genres: isUnseen, searchLabel: isUnseen ? "Search passages, authors or Greek…" : "Search exercises or grammatical focus…" })}<div class="results-heading"><span>${filtered.length} ${filtered.length === 1 ? "exercise" : "exercises"}${p.get("q") ? " matching your search" : ""}</span><span>Progress is saved in this browser</span></div>${filtered.length ? `<div class="library-list">${page.items.map((item) => libraryRow(ctx, kind, item)).join("")}</div>${page.html}` : `<div class="panel">${empty("No exercises match", "Try a broader search or reset your filters.", isUnseen ? "translate" : "pen")}${button("Reset filters", "reset-filters")}</div>`}`;
}
function libraryRow(ctx, kind, item) {
  const p = getEntry(kind, item.id),
    query = ctx.params.toString();
  return `<div class="library-row"><span class="library-number">${String(item.number || "").padStart(2, "0")}</span><a href="#/${routeFor(kind, item)}${query ? "?" + esc(query) : ""}"><h3>${esc(item.title)}</h3><div class="row-meta">${badge(item.status)}<span>${esc(item.author || (item.format === "continuous" ? "Continuous prose" : "Sentence exercise"))}</span><span>·</span><span>${esc(item.difficulty)}</span>${p.completed ? "<span>· Completed ✓</span>" : p.attempted ? "<span>· Attempted</span>" : ""}</div></a><div class="row-tags">${
    item.topic_ids
      ?.slice(0, 1)
      .map(
        (id) =>
          `<span>${esc(ctx.c.grammar.find((t) => t.id === id)?.title)}</span>`,
      )
      .join("") || ""
  }${item.genre ? `<span class="badge">${esc(item.genre)}</span>` : ""}</div>${button(icon("bookmark", 16), "bookmark", `data-kind="${kind}" data-id="${item.id}" aria-label="Bookmark ${esc(item.title)}" aria-pressed="${Boolean(p.bookmarked)}"`, "icon-btn")}</div>`;
}
export function renderExercise(ctx, kind, id) {
  const c = ctx.c,
    item = c[kind].find((i) => i.id === id);
  if (!item)
    return empty(
      "Exercise not found",
      "Return to the library and choose another exercise.",
    );
  const p = getEntry(kind, id),
    isUnseen = kind === "unseen",
    route = isUnseen ? "unseen" : "composition",
    siblings = filterItems(c, c[kind], ctx.params, kind),
    index = siblings.findIndex((i) => i.id === id),
    query = ctx.params.toString(),
    suffix = query ? "?" + esc(query) : "";
  const vocabulary = isUnseen ? item.glosses : item.vocabulary,
    model = isUnseen ? item.translation : item.model_greek;
  return `<div class="page-heading practice-header"><div><div class="eyebrow">${href(isUnseen ? "Unseen translation" : "Prose composition", route + suffix)} / Exercise ${String(item.number).padStart(2, "0")}</div><h1>${esc(item.title)}</h1><p>${isUnseen ? esc(item.author) + " · " + esc(item.genre) : item.format === "continuous" ? "Continuous prose" : "Sentence exercise"}</p></div>${badge(item.status)}</div>${item.status === "sample" ? sampleNotice() : item.status === "draft" ? '<div class="notice">This exercise is incomplete. Some fields are awaiting import.</div>' : ""}
 <div class="practice-layout"><div><div class="panel"><div class="section-heading" style="margin-top:0"><h2>${isUnseen ? "The Greek passage" : "English to translate"}</h2>${button(icon("bookmark", 16), "bookmark", `data-kind="${kind}" data-id="${id}" aria-label="Bookmark exercise" aria-pressed="${Boolean(p.bookmarked)}"`, "icon-btn")}</div>${(isUnseen ? item.greek : item.english) ? `<div class="${isUnseen ? "greek" : "english"}" ${isUnseen ? 'lang="grc"' : ""}>${esc(isUnseen ? item.greek : item.english)}</div>` : empty("Passage awaiting import", "This is a preview of the exercise workspace. The source passage and model answer have not been supplied.", isUnseen ? "translate" : "pen")}
 ${vocabulary?.length ? `<details><summary>${isUnseen ? "Vocabulary & glosses" : "Vocabulary assistance"}</summary><div><ul class="gloss-list">${vocabulary.map((v) => `<li><span lang="grc">${esc(v.greek)}</span> — ${esc(v.english)}</li>`).join("")}</ul></div></details>` : ""}${item.hints?.length ? `<details><summary>${isUnseen ? "Hints" : "Syntax hints"}</summary><div><ul>${item.hints.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div></details>` : ""}</div>
 <div class="panel"><label class="label" for="exercise-draft" style="margin-top:0">Your ${isUnseen ? "translation" : "Greek answer"}</label><textarea id="exercise-draft" ${isUnseen ? "" : 'lang="grc"'} data-draft-kind="${kind}" data-draft-id="${id}" placeholder="${isUnseen ? "Write your translation here…" : "Compose your Greek here…"}" rows="6">${esc(p.draft)}</textarea><p class="save-note">Saved in this browser as you type. No automatic grading.</p><details><summary>${isUnseen ? "Reveal model translation" : "Reveal model Greek"}</summary><div class="${isUnseen ? "english" : "greek"}" ${isUnseen ? "" : 'lang="grc"'}>${esc(model) || "Model answer awaiting import."}</div></details>${item.alternatives?.length ? `<details><summary>Alternative acceptable constructions</summary><div>${item.alternatives.map((a) => `<p class="greek" lang="grc">${esc(a)}</p>`).join("")}</div></details>` : ""}${item.notes ? `<details><summary>Explanatory notes</summary><div class="prose">${esc(item.notes)}</div></details>` : ""}<div class="reader-toolbar">${button(`${icon("copy", 14)} Copy for external review`, "copy-exercise", `data-kind="${kind}" data-id="${id}"`)}${button(`${icon("check", 14)} ${p.completed ? "Completed" : "Mark complete"}`, "complete", `data-kind="${kind}" data-id="${id}" aria-pressed="${Boolean(p.completed)}"`, "button " + (p.completed ? "primary" : ""))}</div>${confidence(kind, id)}</div>
 <nav class="reader-footer" aria-label="Exercise navigation">${index > 0 ? href(`${icon("back", 14)} Previous`, `${route}/${siblings[index - 1].id}${suffix}`, "button") : button("Previous", "noop", "disabled")}${href("Back to library", route + suffix, "text-link")}${index >= 0 && index < siblings.length - 1 ? href(`Next ${icon("arrow", 14)}`, `${route}/${siblings[index + 1].id}${suffix}`, "button") : button("Next", "noop", "disabled")}</nav></div>
 <aside class="practice-aside"><div class="panel"><h3>About this exercise</h3><dl class="facts"><div class="fact"><dt>Difficulty</dt><dd>${esc(item.difficulty)}</dd></div><div class="fact"><dt>${isUnseen ? "Text type" : "Exercise type"}</dt><dd>${isUnseen ? esc({ original: "Original ancient text", adapted: "Adapted text", composed: "Newly composed Greek" }[item.origin]) : item.format === "continuous" ? "Continuous prose" : "Short sentences"}</dd></div>${item.source ? `<div class="fact"><dt>Attribution / source</dt><dd>${esc(item.source)}</dd></div>` : ""}<div class="fact"><dt>Grammatical focus</dt><dd>${topicLinks(c, item.topic_ids) || "Topics awaiting import"}</dd></div></dl></div><div class="panel"><h3>Your practice</h3><p class="small muted">${p.completed ? "Completed" : p.attempted ? "Attempt recorded" : "Not attempted"}</p>${button(p.attempted ? "Attempt recorded ✓" : "Mark as attempted", "attempt", `data-kind="${kind}" data-id="${id}"`)}<p class="small muted" style="margin:12px 0 0">${item.status === "sample" ? "Demo activity is excluded from study totals." : "Use confidence to decide what to revisit."}</p></div></aside></div>`;
}
export function renderLanguage(ctx) {
  const c = ctx.c,
    filtered = filterItems(c, c.grammar, ctx.params, "grammar"),
    page = pagination(filtered, ctx.params);
  return `<div class="page-heading"><div><h1>Language</h1></div>${href(`${icon("language", 16)} Vocabulary revision`, "vocabulary", "button")}</div>${c.grammar.some((g) => g.status === "sample") ? sampleNotice() : ""}${filters(c, c.grammar, ctx.params, { difficulty: false, searchLabel: "Search grammar notes and examples…" })}<div class="results-heading"><span>${filtered.length} grammar topics</span><span>${c.grammar.filter((g) => g.status === "published").length} published</span></div>${filtered.length ? `<div class="topic-grid">${page.items.map((g, i) => `<a href="#/grammar/${g.id}" class="topic-card"><div class="topic-symbol" aria-hidden="true">${i % 2 ? "α" : "λ"}</div><div class="eyebrow">${esc(g.category)}</div><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p><footer>${badge(g.status)}<span class="text-link">${getEntry("grammar", g.id).completed ? "Studied ✓" : "Open topic"} ${icon("arrow", 14)}</span></footer></a>`).join("")}</div>${page.html}` : `<div class="panel">${empty("No matching topics", "Try another search or reset your filters.", "language")}</div>`}`;
}
export function renderGrammar(ctx, id) {
  const g = ctx.c.grammar.find((g) => g.id === id);
  if (!g) return empty("Topic not found", "Choose a topic from Language.");
  const p = getEntry("grammar", id);
  return `<div class="page-heading"><div><div class="eyebrow">${href("Language", "language")} / ${esc(g.category)}</div><h1>${esc(g.title)}</h1><p>${esc(g.summary)}</p></div>${badge(g.status)}</div>${g.status === "sample" ? sampleNotice() : ""}<div class="practice-layout"><div><article class="panel"><h2>Notes & explanation</h2><div class="prose">${esc(g.explanation) || "Notes awaiting import."}</div>${g.examples?.length ? `<h3 style="margin-top:24px">Examples</h3>${g.examples.map((e) => `<div class="reading-card"><div class="parallel"><div class="greek" lang="grc">${esc(e.greek)}</div><div class="english">${esc(e.english)}</div></div></div>`).join("")}` : '<p class="small muted" style="margin-top:20px">Worked examples will appear here when supplied.</p>'}</article><div class="panel"><h2>Practice</h2>${g.exercises?.length ? g.exercises.map((e, i) => `<div><label class="label" for="grammar-answer-${i}">${esc(e.prompt)}</label><textarea id="grammar-answer-${i}" data-draft-kind="grammar" data-draft-id="${id}" data-field="exercise_${e.id}" rows="3">${esc(p[`exercise_${e.id}`])}</textarea><details><summary>Reveal answer / explanation</summary><div class="prose">${esc(e.answer)}</div></details></div>`).join("") : empty("No practice exercises", "Exercises can be imported with this topic and revealed for self-review.", "pen")}</div><div class="reader-toolbar">${button(`${icon("check", 14)} ${p.completed ? "Studied" : "Mark as studied"}`, "complete", `data-kind="grammar" data-id="${id}" aria-pressed="${Boolean(p.completed)}"`, "button " + (p.completed ? "primary" : ""))}${confidence("grammar", id)}</div></div><aside class="practice-aside"><div class="panel"><h3>Connected topics</h3>${topicLinks(ctx.c, g.related_ids) || '<p class="small muted">Related topics awaiting import.</p>'}</div><div class="panel"><h3>Bookmark</h3>${button(`${icon("bookmark", 15)} ${p.bookmarked ? "Bookmarked" : "Bookmark topic"}`, "bookmark", `data-kind="grammar" data-id="${id}" aria-pressed="${Boolean(p.bookmarked)}"`)}</div></aside></div>`;
}
export function renderVocabulary(ctx, id) {
  const items = filterItems(ctx.c, ctx.c.vocabulary, ctx.params, "vocabulary"),
    v = items.find((v) => v.id === id) || items[0],
    index = items.indexOf(v);
  return `<div class="page-heading"><div><div class="eyebrow">${href("Language", "language")} / Vocabulary</div><h1>Vocabulary</h1></div></div>${filters(ctx.c, ctx.c.vocabulary, ctx.params, { difficulty: false, searchLabel: "Search Greek words or English meanings…" })}${v ? `${v.status === "sample" ? sampleNotice() : ""}<div class="panel vocab-card">${badge(v.status)}<div class="greek" lang="grc">${esc(v.greek)}</div>${ctx.reader.vocabReveal ? `<p class="english">${esc(v.english)}</p><p class="small muted">${esc(v.notes)}</p>` : button("Reveal meaning", "reveal-vocabulary", "", "button primary")}<div>${topicLinks(ctx.c, v.topic_ids)}</div></div><div class="flashcard-actions">${confidence("vocabulary", v.id)}${button(`${icon("bookmark", 14)} Bookmark`, "bookmark", `data-kind="vocabulary" data-id="${v.id}" aria-pressed="${Boolean(getEntry("vocabulary", v.id).bookmarked)}"`)}</div><div class="reader-footer">${index > 0 ? href(`${icon("back", 14)} Previous`, `vocabulary/${items[index - 1].id}`, "button") : button("Previous", "noop", "disabled")}<span class="small muted">${index + 1} of ${items.length}</span>${index < items.length - 1 ? href(`Next ${icon("arrow", 14)}`, `vocabulary/${items[index + 1].id}`, "button") : button("Next", "noop", "disabled")}</div>` : `<div class="panel">${empty("No vocabulary matches", "Import vocabulary or reset your filters.", "language")}</div>`}`;
}
export function renderSearch(ctx) {
  const c = ctx.c,
    items = [
      "texts",
      "sections",
      "grammar",
      "vocabulary",
      "unseen",
      "compositions",
      "annotations",
      "questions",
    ].flatMap((kind) => c[kind].map((i) => ({ ...i, _kind: kind }))),
    filtered = filterItems(c, items, ctx.params),
    page = pagination(filtered, ctx.params, 20);
  return `<div class="page-heading"><div><h1>Search</h1><p>Search texts, Greek passages, grammar and exercises. Greek accents and final sigma are handled automatically.</p></div></div>${filters(c, items, ctx.params, { texts: true, authors: true, genres: true, searchLabel: "Search English or Greek, with or without accents…" })}<div class="results-heading"><span>${filtered.length} results</span></div>${filtered.length ? `<div class="library-list">${page.items.map((i) => `<div class="library-row"><span class="muted">${icon(i._kind === "texts" || i._kind === "sections" ? "book" : "search", 20)}</span><a href="#/${routeFor(i._kind, i)}"><h3>${esc(i.title || i.technique)}</h3><div class="row-meta">${badge(i.status)}<span>${esc(i._kind)}</span>${i.reference ? `<span>· ${esc(i.reference)}</span>` : ""}</div><p class="result-snippet">${esc((i.summary || i.description || i.greek || i.english || i.explanation || i.question || "").slice(0, 170))}${(i.greek || "").length > 170 ? "…" : ""}</p></a><span></span>${icon("chevron", 15)}</div>`).join("")}</div>${page.html}` : `<div class="panel">${empty("No matches yet", "Try fewer words, a Greek stem, or remove a filter.", "search")}</div>`}`;
}
