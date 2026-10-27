try {
  const prefs = JSON.parse(
    localStorage.getItem("greekLabs:v2:preferences") || "{}",
  );
  document.documentElement.dataset.theme =
    prefs.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.style.setProperty(
    "--greek-size",
    `${Math.min(34, Math.max(18, Number(prefs.greekSize) || 23))}px`,
  );
} catch {
  document.documentElement.dataset.theme = "light";
}
window.addEventListener("error", (event) => {
  console.error(
    "GreekLabs runtime:",
    event.message,
    event.filename,
    event.lineno,
    event.colno,
  );
});
