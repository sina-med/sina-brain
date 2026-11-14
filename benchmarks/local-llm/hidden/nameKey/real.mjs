const normalise = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function nameKey(name) {
  return normalise(name).split(" ").map((w) => (w.length > 4 && /[^sui]s$/.test(w) ? w.slice(0, -1) : w)).join(" ");
}
