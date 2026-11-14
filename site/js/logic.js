// Pure logic for the Sina Brain application: no DOM, no storage. Runs in the browser and under Node tests.

/** True when a question is answered with checkboxes: flagged multi on Sina, or more than one keyed answer. */
export const isMulti = (q) => !!q.multi || q.answer.length > 1;

/** Questions and cards that need a figure, a photo or a 3D model the export does not carry. */
export const needsFigure = (x) => !!(x.figure_target || x.model3d || x.kind === "image");

/**
 * Sina's marking rule, ported from qPoints() in the Sina site: any wrong pick scores 0;
 * otherwise the score is the number of right picks over the number of right answers.
 * @returns a number from 0 to 1
 */
export function points(q, chosen) {
  let right = 0, wrong = 0;
  for (const c of chosen) (q.answer.includes(c) ? right++ : wrong++);
  return wrong ? 0 : right / q.answer.length;
}

export const dayNo = (now = Date.now()) => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);

/**
 * Sina's flashcard scheduling, ported from srsNext() in the Sina site.
 * entry = [due day, interval in days (0 = still learning), ease x100, lapses]; grade 1 Again, 2 Hard, 3 Good, 4 Easy.
 */
export function srsNext(e, g, d = dayNo()) {
  let ivl = e ? e[1] : 0, ease = e ? e[2] : 250, lap = e ? e[3] : 0, n;
  if (g === 1) { if (ivl > 0) { lap++; ease = Math.max(130, ease - 20); } return [d, 0, ease, lap]; }
  if (ivl < 1) { if (g === 2) return [d, 0, ease, lap]; n = g === 4 ? 4 : 1; }
  else if (g === 2) { n = Math.max(ivl + 1, Math.round(ivl * 1.2)); ease = Math.max(130, ease - 15); }
  else if (g === 3) n = Math.max(ivl + 1, Math.round(ivl * ease / 100));
  else { n = Math.max(ivl + 2, Math.round(ivl * ease / 100 * 1.3)); ease += 15; }
  n = Math.min(n, 3650);
  return [d + n, n, ease, lap];
}
export const srsLabel = (n) => (!n ? "today" : n < 30 ? n + " d" : n < 365 ? Math.round(n / 30) + " mo" : Math.round(n / 36.5) / 10 + " y");

/** Cards to review now: due ones first, then new ones, in their original order. */
export function dueCards(cards, progress, d = dayNo()) {
  const due = cards.filter((c) => progress[c.id] && progress[c.id][0] <= d), fresh = cards.filter((c) => !progress[c.id]);
  return { due, fresh, later: cards.length - due.length - fresh.length };
}

// ---- search: a linear scan over normalised text. No index structure, no dependency.
export const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Prepare corpus rows [type, id, container, title, text] for searching. */
export function prepare(docs) { return docs.map((d) => ({ type: d[0], id: d[1], container: d[2], title: d[3], text: d[4], nt: " " + norm(d[3]) + " ", nx: " " + norm(d[4]) + " " })); }

const TYPE_WEIGHT = { lecture: 6, paper: 5, section: 3, question: 2, flashcard: 2, slide: 1 };
/**
 * Every query word must occur (as the start of a word) in the title or the text.
 * Ranking: words in the title, whole-word matches, then the kind of record.
 */
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

/** A short excerpt of the text around the first query word. */
export function excerpt(doc, query, size = 150) {
  const w = norm(query).split(" ")[0], i = w ? doc.text.toLowerCase().indexOf(w) : -1, start = Math.max(0, i - 50);
  return (start ? "…" : "") + doc.text.slice(start, start + size) + (doc.text.length > start + size ? "…" : "");
}

// ---- practice bookkeeping (personal data; stored by the app in the browser, never in the exports)
/** Record one answered question. history[id] = { n: attempts, right: fully right attempts, last: day, pts: last score }. */
export function record(history, id, pts, d = dayNo()) {
  const h = history[id] || { n: 0, right: 0 };
  return { ...history, [id]: { n: h.n + 1, right: h.right + (pts === 1 ? 1 : 0), last: d, pts } };
}
export function filterQuestions(qs, history, mode) {
  if (mode === "new") return qs.filter((q) => !history[q.id]);
  if (mode === "mistakes") return qs.filter((q) => history[q.id] && history[q.id].pts < 1);
  return qs;
}
