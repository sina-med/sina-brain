export const norm = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Prepare rows [type, id, container, title, text] for searching. */
export function prepare(docs) { return docs.map((d) => ({ type: d[0], id: d[1], container: d[2], title: d[3], text: d[4], nt: " " + norm(d[3]) + " ", nx: " " + norm(d[4]) + " " })); }

const TYPE_WEIGHT = { lecture: 6, paper: 5, section: 3, question: 2, flashcard: 2, slide: 1 };
export function search(prepared, query, { types = null, limit = 50 } = {}) {
  const words = norm(query).split(" ").filter(Boolean);
  if (!words.length) return { total: 0, hits: [] };
  const hits = [];
  for (const d of prepared) {
    if (types && !types.includes(d.type)) continue;
    let score = TYPE_WEIGHT[d.type] || 0, ok = true;
    for (const w of words) {
      const t = d.nt.indexOf(" " + w), x = t < 0 ? d.nx.indexOf(" " + w) : -1;
      if (t < 0 && x < 0) { ok = false; break; }
      score += t >= 0 ? 10 : 3;
      if ((t >= 0 ? d.nt : d.nx).includes(" " + w + " ")) score += 2;
    }
    if (ok) hits.push({ doc: d, score });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.title.length - b.doc.title.length || (a.doc.id < b.doc.id ? -1 : 1));
  return { total: hits.length, hits: hits.slice(0, limit).map((h) => h.doc) };
}
