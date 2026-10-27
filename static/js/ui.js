export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const normalise = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("el")
    .replace(/ς/g, "σ");
export const icon = (name, size = 20) => {
  const paths = {
    book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z",
    language:
      "M4 5h12 M10 3v2 M6 5c0 7 8 10 8 10 M14 5c0 6-5 10-10 12 M14 21l4-10 4 10 M16 17h4",
    translate: "M5 3h10v4 M15 3l5 5v13H5z M15 3v5h5 M8 12h9 M8 16h6",
    pen: "m15 4 5 5 M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z",
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    back: "M19 12H5 M11 6l-6 6 6 6",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    check: "m5 12 4 4L19 6",
    sun: "M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    moon: "M20 14A9 9 0 0 1 10 3 9 9 0 1 0 20 14",
    chevron: "m9 5 7 7-7 7",
    clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    copy: "M9 9h12v12H9z M15 9V3H3v12h6",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    download: "M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4",
    close: "m6 6 12 12 M18 6 6 18",
    leaf: "M19 3C8 2 2 9 6 16c6 6 15-2 13-13 M5 21 15 9",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(
    paths[name] || paths.book
  )
    .split(" M")
    .map((p, i) => `<path d="${i ? "M" : ""}${p}"/>`)
    .join("")}</svg>`;
};
export const badge = (status) =>
  `<span class="badge ${esc(status)}">${esc({ published: "Available", draft: "Awaiting content", sample: "Demo · unverified" }[status] || status)}</span>`;
export const empty = (title, message, symbol = "book") =>
  `<div class="empty-state"><span class="empty-icon">${icon(symbol, 28)}</span><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`;
export const button = (label, action, attrs = "", cls = "button") =>
  `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
export const href = (label, path, cls = "") =>
  `<a class="${cls}" href="#/${path}">${label}</a>`;
export const meter = (done, total) =>
  `<div class="meter" role="progressbar" aria-label="Completion" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${Math.max(total, 1)}"><span style="width:${total ? Math.min(100, (100 * done) / total) : 0}%"></span></div>`;
export function options(values, current, label) {
  return (
    `<option value="">${esc(label)}</option>` +
    values
      .map((v) => {
        const [value, text] = Array.isArray(v) ? v : [v, v];
        return `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(text)}</option>`;
      })
      .join("")
  );
}
export function prettyDate(date) {
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? ""
    : value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
