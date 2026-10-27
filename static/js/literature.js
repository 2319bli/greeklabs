import { esc, icon, badge, empty, button, href, meter, options } from "./ui.js";
import { getEntry } from "./progressStore.js";

const modes = [
  ["learn", "Learn"],
  ["revision", "Revision"],
  ["style", "Literary style"],
  ["essay", "Essay practice"],
];
const sectionState = (s) => getEntry("sections", s.id);
export const sectionsFor = (c, id) =>
  c.sections
    .filter((s) => s.text_id === id)
    .sort((a, b) => a.number - b.number);
const done = (sections) =>
  sections.filter((s) => sectionState(s).completed).length;
export function progressGrid(sections, active = "") {
  return `<div class="progress-grid">${sections
    .map((s) => {
      const p = sectionState(s);
      const status =
        p.confidence === "difficult"
          ? "difficult"
          : p.completed
            ? "completed"
            : p.started || p.visitedAt
              ? "started"
              : "";
      return href(
        esc(s.number),
        `read/${s.id}/learn`,
        `progress-tile ${status} ${active === s.id ? "active" : ""}`,
      ).replace(
        "<a ",
        `<a aria-label="${esc(s.title)}, ${esc(s.reference)}, ${status || "not started"}" title="${esc(s.reference)} · ${status || "Not started"}" `,
      );
    })
    .join("")}</div>`;
}
export const legend = () =>
  '<div class="legend"><span>Not started</span><span class="started">In progress</span><span class="completed">Learned</span><span class="difficult">Difficult</span></div>';
export function renderLiterature(c) {
  const count = done(c.sections),
    recent = c.sections
      .filter((s) => sectionState(s).visitedAt)
      .sort((a, b) =>
        String(sectionState(b).visitedAt).localeCompare(
          String(sectionState(a).visitedAt),
        ),
      )[0];
  const text = c.texts.find((t) => t.id === recent?.text_id);
  return `<div class="page-heading"><div><h1>Literature</h1></div><span class="tag">${icon("book", 14)} OCR A-level Classical Greek</span></div>
 ${recent ? `<section class="resume-reading"><div><h2>${esc(text.title)}</h2><p>${esc(recent.title)} · ${esc(recent.reference)}</p></div>${href(`Continue reading ${icon("arrow", 16)}`, `read/${recent.id}/learn`, "button")}</section>` : ""}
 <div class="section-heading"><h2>Set texts <span class="muted">&nbsp; / &nbsp;${c.texts.length} collections</span></h2><span class="muted">${count} of ${c.sections.length} sections learned</span></div>
 <div class="text-grid">${c.texts.map((t, i) => textCard(c, t, i)).join("")}</div>`;
}

function textCard(c, t, index) {
  const sections = sectionsFor(c, t.id),
    completed = done(sections),
    available = sections.length > 0;
  return `<article class="text-card"><a href="#/literature/${t.id}" class="card-art ${["", "terracotta", "blue", "olive"][index % 4]}" aria-label="Explore ${esc(t.title)}"><span class="card-category">${esc(t.genre)}</span>${badge(t.status)}<span class="motif" lang="grc" aria-hidden="true">${["Ἠλ", "Ηρ", "Ω", "Ηρ"][index % 4]}</span></a><div class="card-body"><div class="card-author">${esc(t.author)}</div><h3>${href(esc(t.title), `literature/${t.id}`)}</h3><div class="card-meta">${icon("book", 13)} ${esc(t.scope)}</div>${t.description ? `<p>${esc(t.description)}</p>` : ""}<div class="card-progress"><div class="progress-label"><span>${available ? `${completed} / ${sections.length} sections learned` : "0 sections"}</span><span>${available ? Math.round((completed / sections.length) * 100) + "%" : "Awaiting content"}</span></div>${meter(completed, sections.length)}</div><div class="card-footer"><span>${available ? "Learn · Revise · Analyse" : ""}</span>${href(`${available ? "Open text" : "View text"} ${icon("arrow", 14)}`, `literature/${t.id}`, "text-link")}</div></div></article>`;
}
export function renderText(c, id) {
  const t = c.texts.find((t) => t.id === id);
  if (!t)
    return empty("Text not found", "Choose a collection from Literature.");
  const sections = sectionsFor(c, id),
    count = done(sections);
  return `<div class="page-heading"><div><div class="eyebrow">${esc(t.author)} / ${esc(t.genre)}</div><h1>${esc(t.title)}</h1><p>${esc(t.scope)}${t.description ? ` · ${esc(t.description)}` : ""}</p></div>${badge(t.status)}</div>
 ${sections.length ? `<div class="panel"><div class="section-heading" style="margin-top:0"><h2>Your progress</h2><span class="muted">${count} / ${sections.length} learned</span></div>${meter(count, sections.length)}${progressGrid(sections)}${legend()}</div><div class="section-heading"><h2>Choose a section</h2><span class="muted">${sections.length} sections</span></div><div class="section-list">${sections.map((s) => `<a class="section-item" href="#/read/${s.id}/learn"><div><strong>${esc(s.title)}</strong><span>${esc(s.reference)}</span></div><span class="status-dot ${sectionState(s).completed ? "completed" : ""}" aria-label="${sectionState(s).completed ? "Learned" : "Not yet learned"}"></span>${icon("chevron", 15)}</a>`).join("")}</div>` : `<section class="panel">${empty("Content not yet available", `This collection covers ${t.scope.toLowerCase()}. Greek passages, literal translations, literary annotations and essay questions are awaiting import.`)}<div class="flashcard-actions">${href("Back to literature", "literature", "button")}</div></section>`}`;
}
function bookmark(kind, id, label = "Bookmark") {
  const on = getEntry(kind, id).bookmarked;
  return button(
    icon("bookmark", 17),
    "bookmark",
    `data-kind="${kind}" data-id="${id}" aria-label="${esc(label)}" title="${esc(label)}" aria-pressed="${Boolean(on)}"`,
    "icon-btn",
  );
}
export function confidence(kind, id) {
  const value = getEntry(kind, id).confidence;
  return `<div class="confidence"><span>Difficulty</span>${["easy", "medium", "difficult"].map((v) => button(v[0].toUpperCase() + v.slice(1), "confidence", `data-kind="${kind}" data-id="${id}" data-value="${v}" aria-pressed="${value === v}"`)).join("")}</div>`;
}
function greekLines(section) {
  let previous = "";
  return section.lines
    .map((line) => {
      const speaker =
        line.speaker !== previous
          ? `<div class="speaker">${esc(line.speaker)}</div>`
          : "";
      previous = line.speaker;
      return `${speaker}<div class="verse" id="line-${line.id}"><span class="number">${line.number}</span><span>${esc(line.text)}</span><button class="line-bookmark" data-action="bookmark" data-kind="lines" data-id="${section.id}:${line.id}" aria-label="Bookmark line ${line.number}" aria-pressed="${Boolean(getEntry("lines", `${section.id}:${line.id}`).bookmarked)}">${icon("bookmark", 13)}</button></div>`;
    })
    .join("");
}
function glosses(units) {
  return units
    .map(
      (u) =>
        `${u.glosses?.length ? `<details><summary>Vocabulary · ${esc(u.reference)}</summary><div><ul class="gloss-list">${u.glosses.map((v) => `<li><span lang="grc">${esc(v.greek)}</span> — ${esc(v.english)}</li>`).join("")}</ul></div></details>` : ""}${u.grammar_notes?.length ? `<details><summary>Grammar annotations · ${esc(u.reference)}</summary><div>${u.grammar_notes.map((n) => `<p>${esc(n.note)} ${href("Study topic", `grammar/${n.topic_id}`, "topic-link")}</p>`).join("")}</div></details>` : ""}`,
    )
    .join("");
}
export function renderReader(ctx, id, mode = "learn") {
  const c = ctx.c,
    s = c.sections.find((s) => s.id === id);
  if (!s)
    return empty(
      "Section not found",
      "This section may not have been imported yet.",
    );
  const t = c.texts.find((t) => t.id === s.text_id),
    sections = sectionsFor(c, t.id),
    index = sections.findIndex((x) => x.id === id),
    p = sectionState(s);
  if (!modes.some((m) => m[0] === mode)) mode = "learn";
  const head = `<div class="page-heading reader-heading"><div><div class="eyebrow">${href(esc(t.author) + " / " + esc(t.title), `literature/${t.id}`)}</div><h1>${esc(s.title)} <span class="muted">· ${esc(s.reference)}</span></h1></div><div class="control-group">${bookmark("sections", s.id, "Bookmark section")}${button(`${icon("check", 15)} ${p.completed ? "Learned" : "Mark as learned"}`, "complete", `data-kind="sections" data-id="${s.id}" aria-pressed="${Boolean(p.completed)}"`, "button " + (p.completed ? "primary" : ""))}</div></div>`;
  return (
    head +
    `<div class="reader-layout"><aside class="section-rail"><h3>${esc(t.title)}</h3><div class="rail-links">${sections.map((sec) => `<a href="#/read/${sec.id}/${mode}" class="${sec.id === s.id ? "active" : ""}" ${sec.id === s.id ? 'aria-current="page"' : ""}><span>${esc(sec.title)}</span><small>${sectionState(sec).completed ? "✓" : sec.line_start ? sec.line_start + "–" + sec.line_end : ""}</small></a>`).join("")}</div><div style="margin-top:16px">${meter(done(sections), sections.length)}<p class="small muted" style="margin:7px 0 0">${done(sections)} / ${sections.length} learned</p></div></aside><div class="reader-workspace"><label class="section-jump"><span class="screen-reader">Jump to section</span><select id="section-jump" data-mode="${mode}">${sections.map((sec) => `<option value="${sec.id}" ${sec.id === s.id ? "selected" : ""}>${esc(sec.title)} · ${esc(sec.reference)}</option>`).join("")}</select></label><nav class="mode-tabs" aria-label="Revision modes">${modes.map(([key, label]) => href(label, `read/${s.id}/${key}`, `mode-tab ${mode === key ? "active" : ""}`).replace("<a ", `<a ${mode === key ? 'aria-current="page"' : ""} `)).join("")}</nav>
 ${s.status !== "published" ? `<div class="notice sample">${s.status === "sample" ? "Demonstration content · not verified educational material." : "This section is incomplete and awaiting supplied content."}</div>` : ""}
 ${mode === "learn" ? renderLearn(ctx, s) : mode === "revision" ? renderRecall(ctx, s) : mode === "style" ? renderStyle(c, s) : renderEssay(ctx, s)}
 <div class="reader-footer">${index ? href(`${icon("back", 14)} Previous`, `read/${sections[index - 1].id}/${mode}`, "button") : button(`${icon("back", 14)} Previous`, "noop", "disabled")}<span class="muted small">${index + 1} of ${sections.length}</span>${index < sections.length - 1 ? href(`Next section ${icon("arrow", 14)}`, `read/${sections[index + 1].id}/${mode}`, "button") : button(`Next section ${icon("arrow", 14)}`, "noop", "disabled")}</div></div></div>`
  );
}
function renderLearn(ctx, s) {
  const ui = ctx.reader;
  return `<div class="reader-toolbar"><div class="control-group">${button(`${icon("eye", 14)} ${ui.hideGreek ? "Show" : "Hide"} Greek`, "hide-greek", `aria-pressed="${Boolean(ui.hideGreek)}"`)}${button(`${icon("eye", 14)} ${ui.hideEnglish ? "Show" : "Hide"} English`, "hide-english", `aria-pressed="${Boolean(ui.hideEnglish)}"`)}</div><div class="control-group"><label for="greek-size">Greek size <input type="range" id="greek-size" min="18" max="34" step="1" value="${ctx.greekSize}" aria-label="Greek text size"></label></div></div>
 ${s.alignment_note ? `<div class="notice">${esc(s.alignment_note)}</div>` : ""}${s.source_note ? `<div class="notice">${esc(s.source_note)}</div>` : ""}
 <div class="reading-card"><div class="reading-labels"><span>Original Greek</span><span>${s.translation_type === "literal" ? "Literal English" : "Supplied English translation"}</span></div>${s.units.length ? s.units.map((u) => `<section class="unit"><div class="unit-meta"><span>${esc(u.reference)}</span>${bookmark("units", `${s.id}:${u.id}`, "Bookmark reading unit")}</div><div class="parallel"><div class="greek" lang="grc">${ui.hideGreek ? '<div class="hidden-text">Greek is hidden</div>' : s.lines && s.alignment === "section" ? greekLines(s) : esc(u.greek) || '<span class="muted">Greek awaiting import.</span>'}</div><div class="english">${ui.hideEnglish ? '<div class="hidden-text">English is hidden</div>' : esc(u.translation) || '<span class="muted">Translation awaiting import.</span>'}</div></div></section>`).join("") : empty("Reading units awaiting import", "This section has no aligned reading units yet.")}</div>
 ${glosses(s.units)}<div class="reader-toolbar">${confidence("sections", s.id)}${button(`${icon("copy", 14)} Copy section`, "copy-section", `data-id="${s.id}"`)}</div><p class="small muted">Original translations are preserved as supplied. New imports can specify verified literal translations and finer alignment.</p>`;
}
export function recallPrompts(ctx, s) {
  const scope = ctx.reader.scope || "section";
  const secs = scope === "section" ? [s] : sectionsFor(ctx.c, s.text_id);
  return secs
    .flatMap((sec) => sec.units.map((u) => ({ section: sec, unit: u })))
    .filter(({ section, unit }) => {
      if (scope !== "difficult") return true;
      const legacy = sectionState(section).legacy?.weakSentences || [];
      return (
        getEntry("units", `${section.id}:${unit.id}`).confidence ===
          "difficult" ||
        sectionState(section).confidence === "difficult" ||
        legacy.some((line) => unit.greek.includes(line))
      );
    });
}
function renderRecall(ctx, s) {
  const ui = ctx.reader,
    prompts = recallPrompts(ctx, s);
  ui.cursor = Math.max(0, Math.min(ui.cursor || 0, prompts.length - 1));
  const item = prompts[ui.cursor];
  const controls = `<div class="reader-toolbar"><label class="small muted" for="recall-scope">Practice scope <select id="recall-scope">${[
    ["section", "This section"],
    ["text", "Whole text"],
    ["difficult", "Difficult passages"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${(ui.scope || "section") === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></label><span class="small muted">Self-assessment · no automatic marks</span></div>`;
  if (!item)
    return (
      controls +
      `<div class="panel">${empty("Nothing to revisit here yet", "Mark a passage Difficult to add it to this practice bank.")} </div>`
    );
  const { section, unit } = item,
    key = `${section.id}:${unit.id}`,
    p = getEntry("units", key);
  return (
    controls +
    `<div class="panel recall-card"><div class="recall-counter"><span>${esc(unit.reference)}</span><span>Chunk ${ui.cursor + 1} / ${prompts.length}</span></div>${section.alignment === "section" ? '<p class="save-note">Section-sized recall: the supplied translation is not aligned to individual verses.</p>' : ""}<div class="greek" lang="grc">${esc(unit.greek)}</div><label for="recall-draft" class="label">Your translation or notes</label><textarea id="recall-draft" data-draft-kind="units" data-draft-id="${key}" placeholder="Recall the meaning before revealing the English…">${esc(p.draft)}</textarea><p class="save-note">Saved in this browser as you type.</p><div class="recall-actions">${button(`${icon("eye", 15)} ${ui.revealed ? "Hide" : "Reveal"} translation`, "reveal-recall", "", "button primary")}${bookmark("units", key, "Bookmark recall chunk")}</div>${ui.revealed ? `<div class="english">${esc(unit.translation) || "Translation awaiting import."}</div><div style="margin-top:20px">${confidence("units", key)}</div>` : ""}</div><div class="recall-actions">${button(`${icon("back", 14)} Previous chunk`, "prev-chunk", ui.cursor === 0 ? "disabled" : "")}${button(`${icon("copy", 14)} Copy for external review`, "copy-recall")}${button(`Next chunk ${icon("arrow", 14)}`, "next-chunk", ui.cursor === prompts.length - 1 ? "disabled" : "")}</div>`
  );
}
function renderStyle(c, s) {
  const notes = c.annotations.filter((a) => a.section_id === s.id);
  if (!notes.length)
    return `<div class="panel">${empty("No literary annotations", "Verified literary annotations have not been supplied for this section. Greek quotations, line references, techniques, effects and thematic links will appear here.", "pen")}</div>`;
  return `<div class="notice">Try explaining each quotation before opening its effect and context.</div><div class="reading-card">${notes.map((a) => `<article class="annotation">${badge(a.status)}<p class="small muted" style="margin:10px 0">${esc(a.reference)}</p><blockquote class="greek" lang="grc">${esc(a.quote)}</blockquote><h3>${esc(a.technique)}</h3><details><summary>Reveal effect & context</summary><div><p class="prose">${esc(a.effect)}</p><p class="prose muted">${esc(a.context)}</p></div></details></article>`).join("")}</div>`;
}
function renderEssay(ctx, s) {
  const questions = ctx.c.questions.filter(
    (q) =>
      q.text_id === s.text_id &&
      (!q.section_ids?.length || q.section_ids.includes(s.id)),
  );
  const q =
      questions.find((q) => q.id === ctx.reader.questionId) || questions[0],
    kind = q ? "questions" : "sections",
    id = q?.id || s.id,
    p = getEntry(kind, id);
  return `${questions.length ? `<label class="label" for="essay-question-select">Question bank</label><select id="essay-question-select">${questions.map((x) => `<option value="${x.id}" ${x.id === q.id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select><div class="panel" style="margin-top:18px">${badge(q.status)}<p class="small muted" style="margin-top:12px">${esc(q.reference)}</p><h2>${esc(q.question)}</h2></div>` : `<div class="notice">No verified essay questions have been supplied for this section. You can still keep a personal plan and draft below.</div>`}
 <div class="panel"><div class="section-heading" style="margin-top:0"><h2>15-marker workspace</h2><span class="small muted">Plan · evidence · analysis</span></div><label class="label" for="essay-plan">Your plan</label><textarea id="essay-plan" rows="4" data-draft-kind="${kind}" data-draft-id="${id}" data-field="plan" placeholder="Question, main argument, key points and supporting quotations…">${esc(p.plan)}</textarea><label class="label" for="essay-draft">Your response</label><textarea id="essay-draft" rows="10" data-draft-kind="${kind}" data-draft-id="${id}" placeholder="Develop your argument here…">${esc(p.draft)}</textarea><p class="save-note">Plan and response are saved automatically in this browser.</p><div class="reader-toolbar">${button(`${icon("copy", 14)} Copy for external review`, "copy-essay", `data-kind="${kind}" data-id="${id}" data-question="${q?.id || ""}"`)}${q ? button(`${getEntry("questions", q.id).completed ? "✓ Completed" : "Mark practice complete"}`, "complete", `data-kind="questions" data-id="${q.id}"`) : ""}</div></div>
 ${q?.quotations?.length ? `<details><summary>Relevant quotations</summary><div>${q.quotations.map((v) => `<p class="greek" lang="grc">${esc(v)}</p>`).join("")}</div></details>` : ""}${q?.points?.length ? `<details><summary>Suggested analytical points</summary><div><ul>${q.points.map((v) => `<li>${esc(v)}</li>`).join("")}</ul></div></details>` : ""}${q?.guidance ? `<details><summary>Model plan or guidance</summary><div class="prose">${esc(q.guidance)}</div></details>` : ""}<p class="small muted">This workspace supports planning and self-review. Responses receive no automatic marks.</p>`;
}
