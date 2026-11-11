// Builds the work packet for one lecture: everything a worker is allowed to read, as tagged blocks.
import { sha1 } from "./util.mjs";

/** HTML to readable plain text that keeps table rows and list items on their own lines. */
export function htmlToText(html) {
  return String(html || "")
    .replace(/<\/(p|div|tr|li|h[1-6]|ul|ol|table)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ").replace(/<\/(td|th)>/gi, " | ").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/ ?\| ?\n/g, "\n").replace(/\n\s*\n+/g, "\n").trim();
}

const LETTERS = "ABCDEFGHIJ";

/**
 * @param {string} lectureId  e.g. "lec:anat3-larynx"
 * @param {Map<string,object>} byId  every record in the knowledge base
 * @param {object[]} rows  records belonging to the lecture (any order)
 * @param {object[]} known  concepts already in the knowledge base: {name, kind, aliases}
 * @returns {{text:string, blocks:Record<string,string>, items:string[], hash:string, chars:number}}
 */
export function buildPacket(lectureId, byId, rows, known = []) {
  const lec = byId.get(lectureId);
  if (!lec) throw new Error(`Unknown lecture ${lectureId}`);
  const mine = rows.filter((r) => r.lecture === lectureId);
  const by = (type) => mine.filter((r) => r.type === type).sort((a, b) => (a.body.order ?? a.body.n ?? 0) - (b.body.order ?? b.body.n ?? 0) || (a.id < b.id ? -1 : 1));
  const blocks = {};      // tag -> text a quote may be taken from
  const out = [];
  const block = (tag, heading, text) => { blocks[tag] = (heading ? heading + "\n" : "") + text; out.push(`[${tag}]${heading ? " " + heading : ""}\n${text}\n`); };

  out.push(`# Work packet: ${lectureId}`, "",
    `Lecture: ${lec.title}`,
    `Subject: ${(byId.get(lec.subject) || {}).title || lec.subject} › ${(byId.get(lec.module) || {}).title || ""}`, "");

  out.push("## Lecture text", "", "Each block starts with its reference tag in square brackets. Evidence quotes must be copied from these blocks.", "");
  for (const s of by("section")) block(s.id, s.title, htmlToText(s.body.html));
  (lec.body.exam_points || []).forEach((t, i) => block(`exam:${i + 1}`, "", htmlToText(t)));
  (lec.body.high_yield || []).forEach((h, i) => block(`hy:${i + 1}`, "", htmlToText(typeof h === "string" ? h : h.html || JSON.stringify(h))));
  (lec.body.deeper || []).forEach((d, i) => block(`deeper:${i + 1}`, d.title || "", htmlToText(d.html)));

  const slides = by("slide").filter((s) => s.body.text_origin !== "none" && s.body.text);
  if (slides.length) out.push("## Slide text (from OCR; may contain errors)", "");
  for (const s of slides) block(s.id, `(slide ${s.body.n ?? s.body.label})`, s.body.text);

  const items = [];
  const qs = by("mcq");
  if (qs.length) out.push("## Questions", "", "The correct option is marked with *.", "");
  for (const q of qs) {
    const b = q.body, lines = [];
    b.options.forEach((o, i) => lines.push(`${b.answer.includes(i) ? "*" : " "} ${LETTERS[i]}. ${htmlToText(o)}${b.option_notes && b.option_notes[i] ? `  — ${htmlToText(b.option_notes[i])}` : ""}`));
    if (b.explanation) lines.push(`Explanation: ${htmlToText(b.explanation)}`);
    if (b.figure_target) lines.push(`(Figure question; the arrow points at: ${b.figure_target})`);
    block(q.id, htmlToText(b.stem), lines.join("\n"));
    items.push(q.id);
  }
  const cards = by("flashcard");
  if (cards.length) out.push("## Flashcards", "");
  for (const c of cards) { block(c.id, "", `Front: ${htmlToText(c.body.front)}\nBack: ${htmlToText(c.body.back)}`); items.push(c.id); }

  // Content hash: only the lecture's own material. The known-concept list is advisory and must not force reprocessing.
  const hash = sha1(JSON.stringify(blocks)).slice(0, 16);

  if (known.length) {
    out.push("## Known concepts", "", "Already in the knowledge base. If the lecture means the same thing, use the name exactly as written here.", "");
    for (const k of known) out.push(`- ${k.name} (${k.kind})${k.aliases && k.aliases.length ? " — also: " + k.aliases.join(", ") : ""}`);
    out.push("");
  }
  const text = out.join("\n");
  return { text, blocks, items, hash, chars: text.length };
}
