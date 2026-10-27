// Each item has its own persistent key, so importing one collection cannot erase another.
export const PREFIX = "greekLabs:v2:";
const LEGACY = "greekRevisionProgress";
const memory = new Map();
let storageIssue = "";
const recordKey = (kind, id) => `${PREFIX}entry:${kind}:${id}`;
const allowedKinds = [
  "sections",
  "grammar",
  "vocabulary",
  "unseen",
  "compositions",
  "questions",
  "lines",
  "units",
];
const safeId = /^[a-z0-9][a-z0-9_:-]*$/;

function warn(message) {
  storageIssue = message;
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("storage-warning", { detail: message }),
    );
}
function rawRead(key) {
  try {
    return memory.has(key) ? memory.get(key) : localStorage.getItem(key);
  } catch {
    warn(
      "Browser storage is unavailable. Changes last only for this tab; export a backup before leaving.",
    );
    return memory.get(key) || null;
  }
}
function rawWrite(key, value) {
  try {
    localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
    warn(
      "Your browser could not save changes. Keep this tab open and export a progress backup.",
    );
  }
}
function read(key, fallback) {
  const raw = rawRead(key);
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    // Preserve unreadable data before any replacement, including in a storage-limited tab.
    const recovery = `${PREFIX}recovery:${key}`;
    if (rawRead(recovery) === null) rawWrite(recovery, JSON.stringify({ raw }));
    warn(
      "Some saved data could not be read. The original has been retained in a recovery copy; export a backup.",
    );
    return fallback;
  }
}
export function storageWarning() {
  return storageIssue;
}
export function getEntry(kind, id) {
  return read(recordKey(kind, id), {});
}
export function setEntry(kind, id, patch) {
  if (!allowedKinds.includes(kind) || !safeId.test(id))
    throw Error("Invalid progress identifier");
  const key = recordKey(kind, id),
    current = read(key, {});
  if (current.schema_version > 2) {
    warn(
      "This progress was saved by a newer app version. It has been preserved without changes.",
    );
    return current;
  }
  const next = {
    ...current,
    ...patch,
    schema_version: 2,
    updatedAt: new Date().toISOString(),
  };
  rawWrite(key, JSON.stringify(next));
  return next;
}
export function visit(kind, id) {
  setEntry(kind, id, { visitedAt: new Date().toISOString() });
}
export function toggle(kind, id, field) {
  return setEntry(kind, id, { [field]: !getEntry(kind, id)[field] });
}
export function preference(name, fallback) {
  return read(`${PREFIX}preferences`, {})[name] ?? fallback;
}
export function setPreference(name, value) {
  rawWrite(
    `${PREFIX}preferences`,
    JSON.stringify({ ...read(`${PREFIX}preferences`, {}), [name]: value }),
  );
}
function keys() {
  let saved = [];
  try {
    saved = Object.keys(localStorage);
  } catch {
    /* Memory fallback remains exportable. */
  }
  return [...new Set([...saved, ...memory.keys()])].filter((k) =>
    k.startsWith(PREFIX),
  );
}
export function allEntries() {
  return keys()
    .filter((k) => k.startsWith(`${PREFIX}entry:`))
    .map((k) => {
      const rest = k.slice(`${PREFIX}entry:`.length),
        separator = rest.indexOf(":");
      return {
        kind: rest.slice(0, separator),
        id: rest.slice(separator + 1),
        ...read(k, {}),
      };
    });
}
export function migrateLegacy() {
  if (rawRead(`${PREFIX}legacy-migrated`)) return;
  const raw = rawRead(LEGACY);
  if (!raw) return;
  let old;
  try {
    old = JSON.parse(raw);
    if (!old || typeof old !== "object" || Array.isArray(old)) throw Error();
  } catch {
    warn(
      "Legacy progress could not be read. Its original browser key is unchanged and is included in exports.",
    );
    return;
  }
  for (const textId of ["electra", "herodotus"]) {
    for (const [number, record] of Object.entries(old[textId] || {})) {
      if (!/^\d+$/.test(number) || !record || typeof record !== "object")
        continue;
      const id = `${textId}-${number}`;
      if (!rawRead(recordKey("sections", id)))
        setEntry("sections", id, {
          started: Boolean(
            record.started || record.perfectTests || record.essay12Plus,
          ),
          legacy: record,
        });
    }
  }
  rawWrite(
    `${PREFIX}legacy-migrated`,
    JSON.stringify({ at: new Date().toISOString() }),
  );
}
export function exportProgress() {
  return {
    format: "greeklabs-progress",
    version: 2,
    exportedAt: new Date().toISOString(),
    entries: allEntries(),
    preferences: read(`${PREFIX}preferences`, {}),
    legacy: rawRead(LEGACY),
    recovery: keys()
      .filter((k) => k.includes(":recovery:"))
      .map((key) => ({ key, value: rawRead(key) })),
  };
}
export function importProgress(data) {
  if (
    !data ||
    data.format !== "greeklabs-progress" ||
    data.version !== 2 ||
    !Array.isArray(data.entries)
  )
    throw Error("Choose a GreekLabs version 2 progress backup.");
  // Validate everything before writing anything. Unknown fields are retained for forward compatibility.
  const seen = new Set();
  for (const e of data.entries) {
    if (
      !e ||
      !allowedKinds.includes(e.kind) ||
      typeof e.id !== "string" ||
      !safeId.test(e.id) ||
      e.schema_version !== 2 ||
      typeof e.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(e.updatedAt))
    )
      throw Error(
        "The backup contains an invalid progress record. Nothing was imported.",
      );
    if (seen.has(`${e.kind}:${e.id}`))
      throw Error("Duplicate progress record in backup.");
    seen.add(`${e.kind}:${e.id}`);
    for (const k of ["completed", "bookmarked", "started", "attempted"])
      if (k in e && typeof e[k] !== "boolean")
        throw Error(`Invalid ${k} value in backup.`);
    for (const k of ["draft", "plan", "confidence"])
      if (k in e && typeof e[k] !== "string")
        throw Error(`Invalid ${k} value in backup.`);
  }
  // Retain a full pre-import recovery snapshot before merging.
  rawWrite(
    `${PREFIX}recovery:before-import:${Date.now()}`,
    JSON.stringify(exportProgress()),
  );
  let count = 0;
  for (const entry of data.entries) {
    const { kind, id, ...rest } = entry,
      current = getEntry(kind, id);
    if (current.schema_version > 2) continue;
    if (
      !current.updatedAt ||
      Date.parse(rest.updatedAt) > Date.parse(current.updatedAt)
    ) {
      rawWrite(recordKey(kind, id), JSON.stringify({ ...current, ...rest }));
      count++;
    }
  }
  if (typeof data.legacy === "string" && !rawRead(LEGACY))
    rawWrite(LEGACY, data.legacy);
  return count;
}
