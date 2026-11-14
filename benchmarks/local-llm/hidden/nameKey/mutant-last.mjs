const normalise = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function nameKey(name) {
  return normalise(name).replace(/(\w{4,}[^sui])s$/, "$1");
}
