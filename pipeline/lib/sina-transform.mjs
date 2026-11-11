// Turns Sina's site data into Sina Brain records and relations.
// Pure function: no file or network access, so it can be tested on small fixtures.
// See docs/03-knowledge-model.md for the model.
import { qKey } from "./qkey.mjs";
import { slug, stripHtml, compact, shortHash } from "./util.mjs";

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

/** "21 Sep 2026" -> "2026-09-21". Returns null when the text is not in that form. */
export function parseSinaDate(s) {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(String(s || "").trim());
  if (!m || !MONTHS[m[2]]) return null;
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Stable form of a URL, used to recognise the same external resource across lectures. */
export function normaliseUrl(u) {
  try {
    const x = new URL(String(u).trim());
    if (x.protocol !== "http:" && x.protocol !== "https:") return null;
    return x.protocol + "//" + x.host.toLowerCase() + x.pathname.replace(/\/+$/, "") + x.search;
  } catch { return null; }
}

export function driveId(url) {
  const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|drive\/folders\/)([A-Za-z0-9_-]{10,})/.exec(String(url || ""));
  return m ? m[1] : null;
}

const cut = (s, n = 160) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const slideRef = (src) => { const m = /^files\/slides\/([^/]+)\/([^/]+)\.jpg$/.exec(src || ""); return m ? { lec: m[1], stem: m[2] } : null; };
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} input
 * @param {object} input.sina    The SINA object from the site
 * @param {Record<string,string[]>} input.slides  lecture id -> slide file stems present on disk
 * @param {Record<string,Array<{t:string,b:number[]}>>|null} input.ocr  slide path -> OCR lines, or null when not supplied
 * @param {string[]} [input.models]  3D model keys whose .glb file exists
 */
export function transformSina({ sina: S, slides = {}, ocr = null, models = null }) {
  const files = new Map();      // relative path under kb/ -> rows
  const findings = [];          // data-quality observations, reported, never silently dropped
  const ids = new Map();        // record id -> record (to detect collisions)
  const relIds = new Map();     // relation id -> relation
  const aliases = S.qAlias || {};
  const en = (S.i18n && S.i18n.en) || {};

  const note = (kind, id, detail) => findings.push(compact({ kind, id, detail }));
  const put = (file, rec) => {
    rec = compact(rec);
    if (ids.has(rec.id)) { note("id-collision", rec.id, `second record ignored (${file})`); return null; }
    ids.set(rec.id, rec);
    if (!files.has(file)) files.set(file, []);
    files.get(file).push(rec);
    return rec;
  };
  const relate = (subject, src, type, dst, attrs) => {
    const id = "rel:" + shortHash(src + "|" + type + "|" + dst);
    if (relIds.has(id)) {
      // The same link stated twice (e.g. a page that is both suggested reading and a verification source): keep both roles.
      const first = relIds.get(id), role = attrs && attrs.roles && attrs.roles[0];
      if (role && first.attrs && first.attrs.roles && !first.attrs.roles.includes(role)) first.attrs.roles.push(role);
      return;
    }
    const file = `relations/imported/${subject}.jsonl`;
    if (!files.has(file)) files.set(file, []);
    const rel = compact({ id, src, type, dst, origin: "imported", status: "approved", attrs });
    relIds.set(id, rel);
    files.get(file).push(rel);
  };

  // ---- hierarchy -------------------------------------------------------
  const H = "records/hierarchy.jsonl";
  for (const p of S.programs || []) {
    put(H, { id: `prog:${p.id}`, type: "program", title: en[`program.${p.id}`] || p.id, origin: "sina", status: "approved", ext: { sina: p.id } });
  }
  const subjectIds = new Set();
  const lecturePlace = new Map();   // lecture id -> { subject, module, order, title }
  (S.subjects || []).forEach((s, si) => {
    subjectIds.add(s.id);
    const program = s.program || S.DEFAULT_PROGRAM;
    if (!s.program) note("subject-without-program", `subj:${s.id}`, `assumed ${program}`);
    put(H, { id: `subj:${s.id}`, type: "subject", title: s.name, description: s.blurb, origin: "sina", status: "approved",
      program: program ? `prog:${program}` : undefined, ext: { sina: s.id }, body: { order: si, semester: s.semester, sina_status: s.status } });
    (s.groups || []).forEach((g, gi) => {
      const mod = `mod:${s.id}/${slug(g.name)}`;
      put(H, { id: mod, type: "module", title: g.name, origin: "sina", status: "approved", subject: `subj:${s.id}`, body: { order: gi } });
      (g.items || []).forEach((it, ii) => {
        if (lecturePlace.has(it.id)) { note("lecture-listed-twice", `lec:${it.id}`, `also under ${s.id} / ${g.name}`); return; }
        lecturePlace.set(it.id, { subject: s.id, module: mod, order: ii, title: it.title });
      });
    });
  });
  for (const id of Object.keys(S.lectures || {})) if (!lecturePlace.has(id)) note("lecture-not-in-index", `lec:${id}`, "has data but is not listed under any subject; not imported");

  // ---- resources (shared across lectures) ------------------------------
  const resource = (r, title, kind) => {
    const url = normaliseUrl(r.url);
    if (!url) return null;
    const id = "res:" + shortHash(url, 10);
    if (!ids.has(id)) put("records/resources.jsonl", { id, type: "resource", title: title || url, origin: "original", status: "approved", body: { url: String(r.url).trim(), kind } });
    return id;
  };

  // ---- 3D models -------------------------------------------------------
  for (const [k, m] of Object.entries(S.m3d || {})) {
    const present = models ? models.includes(k) : true;
    if (!present) note("model-file-missing", `m3d:${k}`, `files/m3d/${k}.glb not found`);
    put("records/models.jsonl", { id: `m3d:${k}`, type: "model3d", title: k.charAt(0).toUpperCase() + k.slice(1), origin: "original", status: "approved",
      ext: { sina: k }, body: { file: `files/m3d/${k}.glb`, parts: m.names, attribution: "Z-Anatomy", licence: "CC BY-SA 4.0" }, flags: present ? undefined : ["file-missing"] });
  }

  // ---- questions (shared by lectures and papers) ------------------------
  const questionBody = (q, order) => {
    const answer = Array.isArray(q.answers) ? q.answers : (Number.isInteger(q.answer) ? [q.answer] : []);
    return {
      order, stem: q.q, options: q.options, answer, multi: q.multi ? true : undefined, explanation: q.why,
      option_notes: q.notes, hint: q.hint, figure_target: q.target, model3d: q.m3d, source_note: q.src, sina_x: q.x,
    };
  };
  const checkQuestion = (id, q, body) => {
    if (!q.q || !Array.isArray(q.options) || q.options.length < 2) { note("question-malformed", id, "missing stem or fewer than two options"); return false; }
    if (!body.answer.length) note("question-without-answer", id);
    else if (body.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.options.length)) note("question-answer-out-of-range", id, JSON.stringify(body.answer));
    if (q.notes && q.notes.length !== q.options.length) note("question-notes-count-mismatch", id, `${q.notes.length} notes for ${q.options.length} options`);
    return true;
  };
  // Sina's key ignores which part of a figure a question points at, so two "what is at the arrow?" questions
  // with the same options share a key. They are different questions, so the figure target is part of the ID.
  const questionId = (key, q) => `q:${key}` + (q.target ? `-${slug(q.target)}` : "");
  const idsByKey = new Map();   // Sina key -> record ids, for data that Sina keys by question (highlights)
  const remember = (key, id) => { if (!idsByKey.has(key)) idsByKey.set(key, []); idsByKey.get(key).push(id); };

  /** Same key seen again: identical keys mean identical stem and options, so only the answer and explanation can differ. */
  const sameQuestionAgain = (id, body, where) => {
    const first = ids.get(id).body;
    if (JSON.stringify(first.answer) !== JSON.stringify(body.answer)) note("question-conflicting-answers", id, `${where}: ${JSON.stringify(body.answer)} versus first seen ${JSON.stringify(first.answer)}`);
    else note("question-repeated", id, where);
  };

  // ---- lectures --------------------------------------------------------
  const slideIds = new Set();
  let hlUnmatched = 0;
  const hlUsed = new Set();
  for (const [lid, place] of lecturePlace) {
    const L = (S.lectures || {})[lid];
    const subj = place.subject, subjRef = `subj:${subj}`, lecRef = `lec:${lid}`;
    const dir = `records/${subj}`;

    if (!L) {
      put(`${dir}/lectures.jsonl`, { id: lecRef, type: "lecture", title: place.title, origin: "sina", status: "approved", verification: "unverified",
        subject: subjRef, module: place.module, ext: { sina: lid }, body: { order: place.order }, flags: ["no-content"] });
      note("lecture-without-content", lecRef, "listed on Sina but has no data yet");
      continue;
    }

    // source file
    const hasSource = !!(L.sourceUrl || L.sourceFile || L.sourcePdf);
    const srcRef = hasSource ? `src:${lid}` : undefined;
    if (hasSource) {
      put(`sources/${subj}/sources.jsonl`, { id: srcRef, type: "source", title: L.sourceFile || L.title, origin: "original", status: "approved",
        subject: subjRef, lecture: lecRef, body: { url: L.sourceUrl, drive_id: driveId(L.sourceUrl), site_copy: L.sourcePdf } });
    } else note("lecture-without-source", lecRef);

    // slides
    const stems = (slides[lid] || []).slice().sort();
    if (!stems.length) note("lecture-without-slides", lecRef);
    for (const stem of stems) {
      const path = `files/slides/${lid}/${stem}.jpg`;
      const lines = ocr ? (ocr[path] || []).filter((x) => x && x.t && String(x.t).trim()) : [];
      const n = parseInt(stem.replace(/\D/g, ""), 10);
      const id = `slide:${lid}/${stem}`;
      slideIds.add(id);
      put(`sources/${subj}/slides.jsonl`, { id, type: "slide", title: `Slide ${Number.isNaN(n) ? stem : n}`, origin: "original", status: "approved",
        subject: subjRef, lecture: lecRef, source: srcRef,
        body: { n: Number.isNaN(n) ? undefined : n, label: /^\d+$/.test(stem) ? undefined : stem, image: path,
          text_origin: lines.length ? "ocr" : "none", text: lines.map((x) => String(x.t).trim()).join("\n"),
          lines: lines.map((x) => [String(x.t).trim(), ...(x.b || []).map(round2)]) } });
    }

    // lecture
    const verifiedOn = parseSinaDate(L.verified);
    if (L.verified && !verifiedOn) note("lecture-verified-date-unreadable", lecRef, String(L.verified));
    const fig = L.visual && L.visual.figure;
    put(`${dir}/lectures.jsonl`, { id: lecRef, type: "lecture", title: L.title || place.title, origin: "sina", status: "approved",
      verification: verifiedOn ? "sina-verified" : "unverified", subject: subjRef, module: place.module, source: srcRef,
      provenance: hasSource ? [{ source: srcRef, note: L.sourceFile }] : undefined, ext: { sina: lid },
      body: { order: place.order, verified_on: verifiedOn, build_note: L.buildNote, exam_points: L.exam, high_yield: L.highYield, deeper: L.deeper,
        figure: fig ? { alt: fig.alt, caption: fig.caption, labels: Object.values(fig.parts || {}).map((p) => [].concat(p.label || []).join(" ")).filter(Boolean) } : undefined,
        visual_kinds: L.visual ? Object.keys(L.visual).filter((k) => k !== "kind" && k !== "intro").sort() : undefined } });
    if (L.title && L.title !== place.title) note("lecture-title-differs-from-index", lecRef, `index: ${place.title}`);

    // sections
    (L.summary || []).forEach((s, i) => {
      if (!s.id) { note("section-without-id", lecRef, `position ${i}`); return; }
      put(`${dir}/sections.jsonl`, { id: `sec:${lid}/${s.id}`, type: "section", title: s.title, origin: "sina", status: "approved",
        subject: subjRef, module: place.module, lecture: lecRef, body: { order: i, html: s.html } });
    });

    // reading resources and verification sources
    for (const r of L.resources || []) {
      const id = resource(r, r.title, r.kind);
      if (!id) { note("resource-url-unreadable", lecRef, String(r.url)); continue; }
      relate(subj, lecRef, "references", id, { roles: ["reading"], title: r.title, why: r.why, note: r.note });
    }
    for (const r of L.sources || []) {
      const id = resource(r, r.name);
      if (!id) { note("resource-url-unreadable", lecRef, String(r.url)); continue; }
      relate(subj, lecRef, "references", id, { roles: ["checked-against"], title: r.name });
    }

    // questions
    (L.mcqs || []).forEach((q, i) => {
      const key = qKey(q, aliases), id = questionId(key, q), body = questionBody(q, i);
      if (!checkQuestion(id, q, body)) return;
      if (ids.has(id)) { sameQuestionAgain(id, body, `again in ${lecRef}`); return; }
      remember(key, id);
      const adapted = q.src && /adapted/i.test(q.src);
      put(`${dir}/mcqs.jsonl`, { id, type: "mcq", title: cut(stripHtml(q.q)), origin: q.src && !adapted ? "original" : "sina", status: "approved",
        subject: subjRef, module: place.module, lecture: lecRef, ext: { sina: key }, body });
      const boxes = (S.hl || {})[key] || {};
      for (const s of q.slides || []) {
        const ref = slideRef(s.src), sid = ref && `slide:${ref.lec}/${ref.stem}`;
        if (!sid || !slideIds.has(sid) && !(slides[ref.lec] || []).includes(ref.stem)) { note("question-cites-missing-slide", id, String(s.src)); continue; }
        if (boxes[s.src]) hlUsed.add(key + "|" + s.src);
        relate(subj, id, "cites", sid, { boxes: boxes[s.src] });
      }
      if (q.m3d && q.m3d.m) {
        if (ids.has(`m3d:${q.m3d.m}`)) relate(subj, id, "references", `m3d:${q.m3d.m}`, { parts: q.m3d.hl });
        else note("question-cites-missing-model", id, q.m3d.m);
      }
    });

    // flashcards
    (L.cards || []).forEach((c, i) => {
      if (!c.id) { note("flashcard-without-id", lecRef, `position ${i}`); return; }
      put(`${dir}/flashcards.jsonl`, { id: `card:${lid}/${c.id}`, type: "flashcard", title: cut(stripHtml(c.front)), origin: "sina", status: "approved",
        subject: subjRef, module: place.module, lecture: lecRef, body: { order: i, kind: c.type, front: c.front, back: c.back, figure_target: c.target } });
    });
  }

  // ---- past papers -----------------------------------------------------
  const paperLec = S.paperLec || {};
  const paperLecUsed = new Set();
  for (const p of S.papers || []) {
    const pid = `paper:${p.id}`;
    if (!subjectIds.has(p.subject)) {
      subjectIds.add(p.subject);
      const title = (S.otherPaperGroups || {})[p.subject] || p.subject;
      put(H, { id: `subj:${p.subject}`, type: "subject", title, origin: "sina", status: "approved", program: p.program ? `prog:${p.program}` : undefined,
        ext: { sina: p.subject }, flags: ["papers-only"] });
      note("subject-created-for-papers", `subj:${p.subject}`, "not in Sina's subject list; exists only to hold past papers");
    }
    const subjRef = `subj:${p.subject}`;
    const qs = (p.questions && p.questions.length ? p.questions : (S.paperQs || {})[p.id]) || [];
    const keyBy = p.keyBy || (S.paperKeyBy || {})[p.id];
    const answerKey = keyBy === "sina" ? "written-by-sina" : keyBy === "part" ? "partly-written-by-sina" : undefined;
    const origin = /^sina\b/i.test(p.title || "") ? "sina" : "original";
    put("records/papers.jsonl", { id: pid, type: "paper", title: p.title, origin, status: "approved", program: p.program ? `prog:${p.program}` : undefined, subject: subjRef,
      ext: { sina: p.id }, body: { year: p.year, note: p.note, links: p.links, answer_key: answerKey, question_count: qs.length || undefined } });
    qs.forEach((q, i) => {
      const key = qKey(q, aliases), id = questionId(key, q), body = { ...questionBody(q, i), answer_key: answerKey };
      if (!checkQuestion(id, q, body)) return;
      if (ids.has(id)) sameQuestionAgain(id, body, `again in ${pid}`);
      else {
        remember(key, id);
        put(`records/${p.subject}/paper-mcqs.jsonl`, { id, type: "mcq", title: cut(stripHtml(q.q)), origin, status: "approved", subject: subjRef,
          ext: { sina: key, first_paper: p.id }, body });
      }
      relate(p.subject, id, "appears-in", pid, { n: i + 1 });
      const lec = paperLec[key];
      if (lec) {
        paperLecUsed.add(key);
        if (lecturePlace.has(lec)) relate(p.subject, id, "tests", `lec:${lec}`);
        else note("paper-question-linked-to-unknown-lecture", id, lec);
      }
      for (const s of q.slides || []) {
        const ref = slideRef(s.src), sid = ref && `slide:${ref.lec}/${ref.stem}`;
        if (sid && slideIds.has(sid)) { hlUsed.add(key + "|" + s.src); relate(p.subject, id, "cites", sid, { boxes: ((S.hl || {})[key] || {})[s.src] }); }
        else note("question-cites-missing-slide", id, String(s.src));
      }
    });
  }
  const paperLecLost = Object.keys(paperLec).filter((k) => !paperLecUsed.has(k)).length;
  if (paperLecLost) note("paper-lecture-links-unmatched", undefined, `${paperLecLost} of ${Object.keys(paperLec).length} entries in paperLec match no paper question`);

  // Sina's highlight table also links questions to slides when the question itself lists none (mostly paper questions).
  for (const [key, bySlide] of Object.entries(S.hl || {})) for (const [src, boxes] of Object.entries(bySlide)) {
    if (hlUsed.has(key + "|" + src)) continue;
    const ref = slideRef(src), sid = ref && `slide:${ref.lec}/${ref.stem}`;
    const owners = idsByKey.get(key);
    if (!owners || !sid || !slideIds.has(sid)) { hlUnmatched++; continue; }
    for (const id of owners) relate(ids.get(id).subject.slice(5), id, "cites", sid, { boxes, via: "highlights" });
  }
  if (hlUnmatched) note("highlights-not-attached", undefined, `${hlUnmatched} highlight entries name a question or slide that no longer exists`);

  // ---- exam scopes (Sina "midterms") ------------------------------------
  for (const m of S.midterms || []) {
    const id = `exam:${m.id}`, subj = m.subject || (m.subjects || [])[0];
    const groups = (m.groups || []).map((g) => ({ name: g.name, lectures: (g.items || []).map((x) => `lec:${x}`), tbc: g.tbc || undefined }));
    put("records/exams.jsonl", { id, type: "exam", title: m.title, origin: "sina", status: "approved", program: m.program ? `prog:${m.program}` : undefined,
      subject: subj ? `subj:${subj}` : undefined, ext: { sina: m.id },
      body: { date: m.date, subjects: (m.subjects || []).map((x) => `subj:${x}`), groups, notes: m.notes, tbc: m.tbc || undefined } });
    for (const g of m.groups || []) for (const x of g.items || []) {
      if (lecturePlace.has(x)) relate(subj || "misc", id, "covers", `lec:${x}`, { group: g.name });
      else note("exam-covers-unknown-lecture", id, x);
    }
  }

  // ---- summary ---------------------------------------------------------
  const counts = {};
  for (const r of ids.values()) counts[r.type] = (counts[r.type] || 0) + 1;
  counts.relation = relIds.size;
  return { files, findings, counts, notImported: ["midOff (off-scope question lists)", "midNote", "occl (image occlusion sets)", "photos (labelled photos)", "updates", "apps", "channels", "usmle", "AnKing (excluded by decision D2)"] };
}
