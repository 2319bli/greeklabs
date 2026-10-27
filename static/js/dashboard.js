import {
  esc,
  icon,
  empty,
  button,
  href,
  meter,
  prettyDate,
  badge,
} from "./ui.js";
import { allEntries, getEntry } from "./progressStore.js";
import { sectionsFor, progressGrid, legend } from "./literature.js";
import { routeFor } from "./libraries.js";

export function resolveEntry(c, e) {
  if (e.kind === "lines" || e.kind === "units") {
    const [sectionId, unitId] = e.id.split(":"),
      section = c.sections.find((s) => s.id === sectionId);
    if (!section) return null;
    const text = c.texts.find((t) => t.id === section.text_id),
      unit = section.units.find((u) => u.id === unitId),
      line = section.lines?.find((l) => l.id === unitId);
    if (!unit && !line) return null;
    return {
      ...e,
      title: `${text.title} · ${line ? "Line " + line.number : unit.reference}`,
      subtitle: e.kind === "lines" ? "Bookmarked verse" : "Reading unit",
      route: `read/${section.id}/learn${line ? "?line=" + line.id : ""}`,
      status: section.status,
      icon: "book",
    };
  }
  const item = c[e.kind]?.find((i) => i.id === e.id);
  if (!item) return null;
  const text = c.texts.find((t) => t.id === item.text_id);
  return {
    ...e,
    title: text ? `${text.title} · ${item.title}` : item.title,
    subtitle:
      {
        sections: item.reference,
        grammar: "Grammar topic",
        unseen: "Unseen translation",
        compositions: "Prose composition",
        questions: "Essay practice",
        vocabulary: "Vocabulary",
      }[e.kind] || "",
    route: routeFor(e.kind, item),
    status: item.status,
    icon:
      {
        sections: "book",
        grammar: "language",
        unseen: "translate",
        compositions: "pen",
        questions: "pen",
        vocabulary: "language",
      }[e.kind] || "book",
  };
}
function activity(e, showConfidence = false) {
  return `<a class="activity-item" href="#/${e.route}"><span class="activity-icon">${icon(e.icon, 16)}</span><div><strong>${esc(e.title)}</strong><small>${esc(e.subtitle)}${e.visitedAt ? " · " + prettyDate(e.visitedAt) : ""}${e.status === "sample" ? " · Demonstration" : ""}</small></div>${showConfidence ? `<span class="badge difficult">${esc(e.confidence)}</span>` : icon("chevron", 14)}</a>`;
}
export function renderDashboard(ctx) {
  const c = ctx.c,
    all = allEntries(),
    entries = all.map((e) => resolveEntry(c, e)).filter(Boolean),
    recent = entries
      .filter((e) => e.visitedAt)
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
      .slice(0, 7),
    bookmarks = entries.filter((e) => e.bookmarked),
    difficult = entries.filter((e) => e.confidence === "difficult");
  const literature = c.sections.filter(
    (s) => getEntry("sections", s.id).completed,
  ).length;
  const attempted = (kind) =>
    c[kind].filter(
      (i) =>
        i.status === "published" &&
        (getEntry(kind, i.id).attempted || getEntry(kind, i.id).completed),
    ).length;
  const grammar = c.grammar.filter(
    (i) => i.status === "published" && getEntry("grammar", i.id).completed,
  ).length;
  const legacy = all.filter((e) => e.legacy).length;
  return `<div class="page-heading"><div><h1>Dashboard</h1></div><span class="tag">${icon("check", 14)} Saved on this device</span></div>
 <div class="stat-grid">${[
   [literature, "Literature sections learned"],
   [attempted("unseen"), "Unseen passages attempted"],
   [attempted("compositions"), "Compositions attempted"],
   [grammar, "Grammar topics studied"],
 ]
   .map(
     ([v, l]) =>
       `<div class="stat"><span class="value">${v}</span><span class="label">${l}</span></div>`,
   )
   .join(
     "",
   )}</div><p class="small muted">Demonstration activity is saved, but excluded from language and practice totals.</p>
 <div class="dashboard-columns"><div><section class="panel"><div class="section-heading" style="margin-top:0"><h2>Literature progress</h2>${href("Explore all", "literature", "text-link")}</div>${c.texts
   .map((t) => {
     const secs = sectionsFor(c, t.id),
       complete = secs.filter(
         (s) => getEntry("sections", s.id).completed,
       ).length;
     return `<div class="dashboard-text"><h3>${href(esc(t.title), `literature/${t.id}`)} <span class="small muted">${secs.length ? `${complete} / ${secs.length}` : "Awaiting content"}</span></h3>${secs.length ? `${meter(complete, secs.length)}${progressGrid(secs)}` : `<p class="small muted">${esc(t.scope)}</p>`}</div>`;
   })
   .join(
     "",
   )}${legend()}</section><section class="panel"><div class="section-heading" style="margin-top:0"><h2>Marked difficult</h2><span class="small muted">${difficult.length} marked difficult</span></div>${difficult.length ? difficult.map((e) => activity(e, true)).join("") : empty("Nothing marked difficult yet", "Use Easy, Medium or Difficult after a reading or exercise.", "eye")}</section></div>
 <div><section class="panel"><h2>Recently visited</h2>${recent.length ? recent.map((e) => activity(e)).join("") : empty("No recent activity", "Open a literature section or a language topic to begin.", "clock")}</section><section class="panel"><div class="section-heading" style="margin-top:0"><h2>Bookmarks</h2><span class="small muted">${bookmarks.length} saved</span></div>${bookmarks.length ? bookmarks.map((e) => activity(e)).join("") : empty("No bookmarks", "Bookmark a section, a tricky line or an exercise to find it here.", "bookmark")}</section></div></div>
 <section class="panel"><div class="section-heading" style="margin-top:0"><h2>Progress backups</h2><span class="small muted">Browser storage · version 2</span></div><p class="muted small">Progress and drafts persist on this browser and address. Export a backup before switching devices, changing the local port or clearing browser data. Imports merge records by their saved time and keep unrelated progress.</p><div class="backup-actions">${button(`${icon("download", 15)} Export progress`, "export-progress", "", "button primary")}${button("Import progress backup", "import-progress")}</div>${legacy ? `<p class="small muted" style="margin:16px 0 0">${legacy} original section records retained. Historical scores and weak sentences remain in your backup; new progress uses your own assessment.</p>` : ""}</section>`;
}
