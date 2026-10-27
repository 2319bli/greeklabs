import { esc, icon, empty, button, href } from "./ui.js";
import {
  getEntry,
  setEntry,
  toggle,
  visit,
  preference,
  setPreference,
  migrateLegacy,
  storageWarning,
  exportProgress,
  importProgress,
} from "./progressStore.js";
import {
  renderLiterature,
  renderText,
  renderReader,
  recallPrompts,
} from "./literature.js";
import {
  renderLibrary,
  renderExercise,
  renderLanguage,
  renderGrammar,
  renderVocabulary,
  renderSearch,
} from "./libraries.js";
import { renderDashboard } from "./dashboard.js";

const main = document.getElementById("main");
const ctx = {
  c: null,
  params: new URLSearchParams(),
  path: [],
  reader: {},
  greekSize: Math.min(34, Math.max(18, Number(preference("greekSize", 23)) || 23)),
};
let previousRoute = "",
  toastTimer,
  searchTimer;
const nav = [
  ["literature", "Literature", "book"],
  ["language", "Language", "language"],
  ["unseen", "Unseen translation", "translate"],
  ["composition", "Prose composition", "pen"],
  ["dashboard", "Dashboard", "grid"],
];
function activeArea() {
  const root = ctx.path[0];
  return ["read"].includes(root)
    ? "literature"
    : ["grammar", "vocabulary"].includes(root)
      ? "language"
      : root;
}
function updateShell() {
  const area = activeArea(),
    name = nav.find((n) => n[0] === area)?.[1] || "Search";
  document.getElementById("sidebar").innerHTML =
    `<a class="brand" href="#/literature" aria-label="GreekLabs home"><span class="brand-mark" aria-hidden="true">γ</span><span>GreekLabs<span style="color:var(--gold)">.</span></span></a><nav class="primary-nav">${nav.map(([path, label, i]) => `<a class="nav-link ${path === area ? "active" : ""}" href="#/${path}" ${path === area ? 'aria-current="page"' : ""}>${icon(i, 18)} ${label}${path === area ? '<span class="nav-dot"></span>' : ""}</a>`).join("")}</nav>`;
  document.getElementById("topbar").innerHTML =
    `${button(icon("menu", 20), "menu", 'aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false"', "icon-btn menu-toggle")}<div class="breadcrumbs"><strong>${esc(name)}</strong></div><div class="top-actions"><form class="global-search" id="global-search" role="search">${icon("search", 15)}<input type="search" name="q" aria-label="Search all content" placeholder="Search all content" value="${ctx.path[0] === "search" ? esc(ctx.params.get("q")) : ""}"><kbd aria-hidden="true">/</kbd></form>${button(icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon", 17), "theme", `aria-label="Switch to ${document.documentElement.dataset.theme === "dark" ? "light" : "dark"} theme"`, "icon-btn")}<a href="#/dashboard" class="avatar" aria-label="Your dashboard">GL</a></div>`;
  document.title = `${name} · GreekLabs`;
}
function render({ shell = false, focus = false } = {}) {
  if (!ctx.c) return;
  const active = document.activeElement,
    token = active?.id,
    action = active?.dataset?.action,
    actionId = active?.dataset?.id,
    actionValue = active?.dataset?.value;
  const selection =
    active?.tagName === "INPUT" && ["text", "search"].includes(active.type)
      ? [active.selectionStart, active.selectionEnd]
      : null;
  if (shell) updateShell();
  const [page, id, mode] = ctx.path;
  try {
    main.innerHTML =
      page === "literature"
        ? id
          ? renderText(ctx.c, id)
          : renderLiterature(ctx.c)
        : page === "read"
          ? renderReader(ctx, id, mode)
          : page === "language"
            ? renderLanguage(ctx)
            : page === "grammar"
              ? renderGrammar(ctx, id)
              : page === "vocabulary"
                ? renderVocabulary(ctx, id)
                : page === "unseen"
                  ? id
                    ? renderExercise(ctx, "unseen", id)
                    : renderLibrary(ctx, "unseen")
                  : page === "composition"
                    ? id
                      ? renderExercise(ctx, "compositions", id)
                      : renderLibrary(ctx, "compositions")
                    : page === "dashboard"
                      ? renderDashboard(ctx)
                      : page === "search"
                        ? renderSearch(ctx)
                        : empty(
                            "This page could not be found",
                            "Choose an area from the main navigation.",
                          );
  } catch (error) {
    console.error("Rendering failed", error);
    main.innerHTML = `<div class="panel">${empty("This view could not be opened", "Your progress has not been reset. Return to Literature or reload the page.")}${href("Open Literature", "literature", "button")}</div>`;
  }
  if (focus) {
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } else if (token) {
    const el = document.getElementById(token);
    if (el) {
      el.focus({ preventScroll: true });
      if (selection) el.setSelectionRange(...selection);
    }
  } else if (action) {
    const el = [...main.querySelectorAll("[data-action]")].find(
      (e) =>
        e.dataset.action === action &&
        e.dataset.id === actionId &&
        e.dataset.value === actionValue,
    );
    el?.focus({ preventScroll: true });
  }
  showStorageWarning();
}
function route() {
  clearTimeout(searchTimer);
  const hash = location.hash.slice(1) || "/literature",
    q = hash.indexOf("?"),
    path = q < 0 ? hash : hash.slice(0, q);
  ctx.params = new URLSearchParams(q < 0 ? "" : hash.slice(q + 1));
  ctx.path = path.split("/").filter(Boolean);
  if (!ctx.path.length) ctx.path = ["literature"];
  const routeKey = ctx.path.join("/");
  if (routeKey !== previousRoute) {
    ctx.reader = {
      scope: "section",
      cursor: 0,
      revealed: false,
      hideGreek: false,
      hideEnglish: false,
      vocabReveal: false,
      questionId: ctx.params.get("question"),
    };
    previousRoute = routeKey;
  }
  if (ctx.params.get("question"))
    ctx.reader.questionId = ctx.params.get("question");
  const [page, id] = ctx.path,
    kind = {
      read: "sections",
      grammar: "grammar",
      unseen: "unseen",
      composition: "compositions",
      vocabulary: "vocabulary",
    }[page];
  if (kind && id && ctx.c?.[kind]?.some((i) => i.id === id)) visit(kind, id);
  document.getElementById("sidebar").classList.remove("open");
  render({ shell: true, focus: true });
  const line = ctx.params.get("line");
  if (line && /^l\d+$/.test(line))
    document
      .getElementById("line-" + line)
      ?.scrollIntoView({ block: "center" });
}
function toast(message) {
  clearTimeout(toastTimer);
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("visible");
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4000);
}
function showStorageWarning() {
  const el = document.getElementById("storage-warning"),
    message = storageWarning();
  el.hidden = !message;
  el.textContent = message;
}
function setFilter(key, value) {
  if (value) ctx.params.set(key, value);
  else ctx.params.delete(key);
  if (key !== "page") ctx.params.delete("page");
  const query = ctx.params.toString();
  history.replaceState(
    null,
    "",
    `#/${ctx.path.join("/")}${query ? "?" + query : ""}`,
  );
  render();
}
function currentSection() {
  return ctx.c.sections.find((s) => s.id === ctx.path[1]);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Ready to paste into your preferred review tool.");
  } catch {
    const dialog = document.createElement("dialog");
    dialog.className = "panel";
    const title = document.createElement("h2");
    title.textContent = "Copy for external review";
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("aria-label", "Text to copy");
    const close = document.createElement("button");
    close.className = "button";
    close.textContent = "Close";
    close.onclick = () => dialog.close();
    dialog.append(title, area, close);
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
    area.focus();
    area.select();
  }
}
function download(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `greeklabs-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function action(el) {
  const { action: a, kind, id } = el.dataset;
  switch (a) {
    case "menu": {
      const open = document.getElementById("sidebar").classList.toggle("open");
      el.setAttribute("aria-expanded", open);
      el.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation",
      );
      return;
    }
    case "theme": {
      const value =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = value;
      setPreference("theme", value);
      updateShell();
      document.querySelector('[data-action="theme"]')?.focus();
      return;
    }
    case "bookmark":
      toggle(kind, id, "bookmarked");
      render();
      return;
    case "complete": {
      const completed = !getEntry(kind, id).completed;
      setEntry(kind, id, {
        completed,
        started: true,
        ...(["unseen", "compositions", "questions"].includes(kind)
          ? { attempted: true }
          : {}),
      });
      toast(
        completed
          ? kind === "sections"
            ? "Section marked as learned."
            : kind === "grammar"
              ? "Topic marked as studied."
              : "Practice marked complete."
          : "Completion removed; your notes are retained.",
      );
      render();
      return;
    }
    case "attempt":
      setEntry(kind, id, { attempted: true });
      toast("Attempt recorded.");
      render();
      return;
    case "confidence":
      setEntry(kind, id, {
        confidence: getEntry(kind, id).confidence === el.dataset.value ? "" : el.dataset.value,
        started: true,
      });
      render();
      return;
    case "hide-greek":
      ctx.reader.hideGreek = !ctx.reader.hideGreek;
      render();
      return;
    case "hide-english":
      ctx.reader.hideEnglish = !ctx.reader.hideEnglish;
      render();
      return;
    case "reveal-recall":
      ctx.reader.revealed = !ctx.reader.revealed;
      render();
      return;
    case "next-chunk":
      ctx.reader.cursor++;
      ctx.reader.revealed = false;
      render();
      return;
    case "prev-chunk":
      ctx.reader.cursor--;
      ctx.reader.revealed = false;
      render();
      return;
    case "reveal-vocabulary":
      ctx.reader.vocabReveal = !ctx.reader.vocabReveal;
      render();
      return;
    case "reset-filters":
      clearTimeout(searchTimer);
      ctx.params = new URLSearchParams();
      history.replaceState(null, "", `#/${ctx.path.join("/")}`);
      render({ shell: true });
      return;
    case "page":
      setFilter("page", el.dataset.page);
      main.scrollIntoView({ block: "start" });
      return;
    case "export-progress":
      download(exportProgress());
      toast("Progress backup downloaded.");
      return;
    case "import-progress":
      document.getElementById("progress-file").click();
      return;
    case "copy-section": {
      const s = ctx.c.sections.find((s) => s.id === id);
      await copy(
        `${s.title} · ${s.reference}\n\nGreek:\n${s.greek}\n\nSupplied translation:\n${s.translation}`,
      );
      return;
    }
    case "copy-recall": {
      const item = recallPrompts(ctx, currentSection())[ctx.reader.cursor];
      if (!item) return;
      const key = `${item.section.id}:${item.unit.id}`;
      await copy(
        `${item.unit.reference}\n\nGreek:\n${item.unit.greek}\n\nMy translation:\n${getEntry("units", key).draft || ""}\n\nSupplied translation:\n${item.unit.translation}`,
      );
      return;
    }
    case "copy-essay": {
      const q = ctx.c.questions.find((q) => q.id === el.dataset.question),
        p = getEntry(kind, id),
        s = currentSection();
      await copy(
        `${q?.question || "Personal essay practice"}\n${s.reference}\n\nGreek:\n${s.greek}\n\nPlan:\n${p.plan || ""}\n\nResponse:\n${p.draft || ""}`,
      );
      return;
    }
    case "copy-exercise": {
      const item = ctx.c[kind].find((i) => i.id === id);
      await copy(
        `${item.title}\n${item.status === "sample" ? "DEMONSTRATION — NOT VERIFIED\n" : ""}${item.source || ""}\n\nPrompt:\n${item.greek || item.english || "[Awaiting import]"}\n\nMy answer:\n${getEntry(kind, id).draft || ""}\n\nModel:\n${item.translation || item.model_greek || "[Awaiting import]"}`,
      );
      return;
    }
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: "start" });
    return;
  }
  const el = event.target.closest("[data-action]");
  if (el && !el.disabled) action(el).catch((error) => toast(error.message));
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.dataset.draftKind) {
    const patch = { [el.dataset.field || "draft"]: el.value };
    if (
      el.value.trim() &&
      ["unseen", "compositions"].includes(el.dataset.draftKind)
    )
      patch.attempted = true;
    setEntry(el.dataset.draftKind, el.dataset.draftId, patch);
  }
  if (el.id === "greek-size") {
    ctx.greekSize = Number(el.value);
    document.documentElement.style.setProperty(
      "--greek-size",
      `${ctx.greekSize}px`,
    );
    setPreference("greekSize", ctx.greekSize);
  }
  if (el.dataset.filter === "q") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setFilter("q", el.value), 160);
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el.dataset.filter && el.dataset.filter !== "q")
    setFilter(
      el.dataset.filter,
      el.type === "checkbox" ? (el.checked ? "1" : "") : el.value,
    );
  if (el.id === "section-jump")
    location.hash = `/read/${el.value}/${el.dataset.mode}`;
  if (el.id === "recall-scope") {
    ctx.reader.scope = el.value;
    ctx.reader.cursor = 0;
    ctx.reader.revealed = false;
    render();
  }
  if (el.id === "essay-question-select") {
    ctx.reader.questionId = el.value;
    render();
  }
  if (el.id === "progress-file" && el.files[0]) {
    try {
      if (el.files[0].size > 20 * 1024 * 1024)
        throw Error("Backup is too large (maximum 20 MB).");
      const count = importProgress(JSON.parse(await el.files[0].text()));
      toast(`Imported ${count} newer records. Other progress is unchanged.`);
      render();
    } catch (error) {
      toast(error.message || "This backup could not be imported.");
    } finally {
      el.value = "";
    }
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "global-search") {
    event.preventDefault();
    const q = new FormData(event.target).get("q");
    location.hash = "/search?q=" + encodeURIComponent(q);
  }
  if (event.target.id === "filters") {
    event.preventDefault();
    clearTimeout(searchTimer);
    setFilter("q", document.getElementById("library-search").value);
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    event.preventDefault();
    document.querySelector("#global-search input")?.focus();
  }
  if (event.key === "Escape") {
    document.getElementById("sidebar").classList.remove("open");
    const menu = document.querySelector('[data-action="menu"]');
    menu?.setAttribute("aria-expanded", "false");
  }
});
window.addEventListener("hashchange", route);
window.addEventListener("storage-warning", showStorageWarning);
window.addEventListener("storage", (event) => {
  if (
    event.key?.startsWith("greekLabs:v2:") &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
  )
    render();
});
async function bootstrap() {
  migrateLegacy();
  const catalogUrl = document.querySelector('meta[name="greeklabs-catalog"]')?.content || "/api/catalog/";
  const response = await fetch(catalogUrl, { cache: "no-cache" });
  if (!response.ok)
    throw Error(
      "The content catalogue could not be loaded. Check your connection and try again.",
    );
  ctx.c = await response.json();
  route();
}
bootstrap().catch((error) => {
  main.innerHTML = `<div class="panel">${empty("Could not load GreekLabs", error.message)}<button class="button" id="reload">Try again</button></div>`;
  document.getElementById("reload").onclick = () => location.reload();
  showStorageWarning();
});
