// Sina Brain read-only application. Static: loads the generated JSON under data/ and keeps personal data in this browser only.
import { isMulti, needsFigure, points, srsNext, srsLabel, dueCards, dayNo, prepare, search, excerpt, record, filterQuestions } from "./logic.js";

const SINA = "https://sina-med.github.io/";   // slide images and figures stay on the Sina site
const app = document.getElementById("app");
const $ = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v === true ? "" : v); } e.append(...kids.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== "" && x !== false)); return e; };
const enc = encodeURIComponent;

// ---- data
const cache = new Map();
const load = (f) => cache.get(f) || cache.set(f, fetch("data/" + f).then((r) => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); })).get(f);
let INDEX = null, WHERE = null;
async function index() {
  if (!INDEX) { INDEX = await load("index.json"); WHERE = new Map(); for (const s of INDEX.subjects) for (const m of s.modules) for (const l of m.lectures) WHERE.set(l.id, { subject: s, module: m, entry: l }); }
  return INDEX;
}
async function lectureOf(id) { await index(); const w = WHERE.get(id); if (!w) return null; const mod = await load(w.module.file); return { ...w, lecture: mod.lectures.find((l) => l.id === id) }; }
const subjectOf = (id) => INDEX.subjects.find((s) => s.id === id);
const tag = (q, w) => ({ ...q, _lecture: w && w.lecture, _where: w });

/** Everything a practice or review scope contains. Scope: lecture:<id> | module:<id> | subject:<id> | paper:<subject id>|<paper id>. */
async function scopeItems(scope) {
  await index();
  const [kind, rest] = [scope.slice(0, scope.indexOf(":")), scope.slice(scope.indexOf(":") + 1)];
  const fromModules = async (mods, subject, pick = () => true) => { const out = { questions: [], cards: [] };
    for (const m of mods) for (const l of (await load(m.file)).lectures) if (pick(l)) { const w = { subject, module: m, lecture: l }; out.questions.push(...l.questions.map((q) => tag(q, w))); out.cards.push(...l.flashcards.map((c) => tag(c, w))); }
    return out; };
  if (kind === "lecture") { const w = WHERE.get(rest); if (!w) return null; return { title: w.entry.title, back: "#/lecture/" + enc(rest), ...(await fromModules([w.module], w.subject, (l) => l.id === rest)) }; }
  if (kind === "module") { const s = INDEX.subjects.find((x) => x.modules.some((m) => m.id === rest)); if (!s) return null; const m = s.modules.find((x) => x.id === rest); return { title: `${s.title}: ${m.title}`, back: "#/subject/" + enc(s.id), ...(await fromModules([m], s)) }; }
  if (kind === "subject") { const s = subjectOf(rest); if (!s) return null; return { title: s.title, back: "#/subject/" + enc(s.id), ...(await fromModules(s.modules, s)) }; }
  if (kind === "paper") { const [sid, pid] = rest.split("|"), s = subjectOf(sid); if (!s || !s.papers_file) return null; const pf = await load(s.papers_file), p = pf.papers.find((x) => x.id === pid); if (!p) return null;
    const byId = new Map(pf.questions.map((q) => [q.id, q])); return { title: p.title, back: `#/paper/${enc(sid)}/${enc(pid)}`, paper: p, questions: p.questions.map((id) => byId.get(id)).filter(Boolean).map((q) => tag(q, null)), cards: [], unresolved: p.questions.filter((id) => !byId.has(id)).length }; }
  return null;
}

// ---- personal data: this browser only, never part of the shared exports
const store = { get(k, d) { try { const v = localStorage.getItem("brain:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem("brain:" + k, JSON.stringify(v)); return true; } catch { return false; } } };

// ---- rendering helpers
// Record HTML is data: only plain formatting tags survive, and no attributes except table spans.
const ALLOWED = new Set(["P", "STRONG", "B", "EM", "I", "U", "SUB", "SUP", "BR", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DIV", "SPAN", "CODE"]);
function safeHtml(html, inline = false) {
  const doc = new DOMParser().parseFromString("<div>" + (html || "") + "</div>", "text/html");
  const walk = (node) => { for (const c of [...node.childNodes]) { if (c.nodeType === 1) { if (!ALLOWED.has(c.tagName)) { c.replaceWith(document.createTextNode(c.textContent)); continue; } for (const a of [...c.attributes]) if (!["colspan", "rowspan", "scope"].includes(a.name) && !(a.name === "class" && a.value === "table-wrap")) c.removeAttribute(a.name); walk(c); } else if (c.nodeType !== 3) c.remove(); } };
  walk(doc.body.firstChild);
  const out = document.createElement(inline ? "span" : "div"); out.append(...doc.body.firstChild.childNodes); return out;
}
const crumbs = (...parts) => $("p", { class: "crumbs" }, parts.flatMap((p, i) => [i ? " › " : "", p[1] ? $("a", { href: p[1], text: p[0] }) : p[0]]));
const btn = (text, href, cls = "") => $("a", { class: "btn " + cls, href, text });
const view = (title, ...kids) => { document.title = title + " · Sina Brain"; app.replaceChildren(...kids.flat(Infinity).filter(Boolean)); window.scrollTo(0, 0); const h = app.querySelector("h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
const missing = () => view("Not found", $("h1", { text: "Not found" }), $("p", {}, $("a", { href: "#/", text: "Back to subjects" })));
function slideFigure(slide, boxes) {
  return $("figure", { class: "slide" }, $("div", { class: "slide-img" }, $("img", { src: SINA + slide.image, alt: `Slide ${slide.n ?? slide.label}`, loading: "lazy" }),
    (boxes || []).map((b) => $("i", { class: "hl", style: `left:${b[0]}%;top:${b[1]}%;width:${b[2]}%;height:${b[3]}%` }))), $("figcaption", { text: `Slide ${slide.n ?? slide.label}` }));
}
const figureNote = (n, what, lectureId) => n ? $("p", { class: "note" }, `${n} ${what} need a labelled figure or 3D model that this preview does not include. `, lectureId ? $("a", { href: `${SINA}#/lecture/${lectureId}`, target: "_blank", rel: "noopener", text: "Open the lecture on Sina" }) : "They are left out here.") : "";

// ---- pages
async function home() {
  const idx = await index(), answers = store.get("answers", {}), cards = store.get("cards", {});
  view("Subjects", $("h1", { text: "Sina Brain" }), $("p", { class: "sub", text: "Lecture summaries, slides, questions, flashcards and past papers imported from Sina." }),
    $("form", { class: "searchbar", role: "search", onsubmit: (e) => { e.preventDefault(); location.hash = "#/search/" + enc(e.target.q.value); } }, $("input", { name: "q", type: "search", placeholder: "Search lectures, slides, questions and flashcards", "aria-label": "Search" }), $("button", { class: "btn primary", text: "Search" })),
    Object.keys(answers).length || Object.keys(cards).length ? $("p", { class: "sub" }, `On this device: ${Object.keys(answers).length} questions answered, ${Object.keys(cards).length} flashcards reviewed. `, $("a", { href: "#/me", text: "My progress" })) : "",
    idx.programs.map((p) => [$("h2", { text: p.title }), $("ul", { class: "list" }, idx.subjects.filter((s) => s.program === p.id).map((s) => $("li", {}, $("a", { href: "#/subject/" + enc(s.id), text: s.title }), $("span", { class: "sub", text: `${s.counts.lectures} lectures · ${s.counts.papers} papers` }))))]));
}
async function subject(id) {
  await index(); const s = subjectOf(id); if (!s) return missing();
  view(s.title, crumbs(["Subjects", "#/"], [s.title]), $("h1", { text: s.title }), s.description ? $("p", { class: "sub", text: s.description }) : "",
    $("p", { class: "actions" }, btn("Practise questions", "#/practice/" + enc("subject:" + s.id), "primary"), btn("Review flashcards", "#/cards/" + enc("subject:" + s.id)), s.papers_file ? btn(`Past papers (${s.counts.papers})`, "#/papers/" + enc(s.id)) : ""),
    s.modules.map((m) => [$("h2", {}, m.title, " ", $("a", { class: "small", href: "#/practice/" + enc("module:" + m.id), text: "practise" }), " ", $("a", { class: "small", href: "#/cards/" + enc("module:" + m.id), text: "flashcards" })),
      $("ul", { class: "list" }, m.lectures.map((l) => $("li", {}, l.has_content ? $("a", { href: "#/lecture/" + enc(l.id), text: l.title }) : $("span", { text: l.title }),
        $("span", { class: "sub", text: l.has_content ? `${l.counts.questions} questions · ${l.counts.flashcards} cards · ${l.counts.slides} slides` : "no content yet" }))))]));
}
async function lecture(id, slideId) {
  const w = await lectureOf(id); if (!w || !w.lecture) return missing();
  const l = w.lecture, usable = l.questions.filter((q) => !needsFigure(q)), usableCards = l.flashcards.filter((c) => !needsFigure(c));
  const viewer = $("div", { class: "viewer" });
  const show = (i) => { const s = l.slides[i]; if (!s) return; const citing = l.questions.filter((q) => q.slides.some((x) => x.id === s.id));
    viewer.replaceChildren($("div", { class: "viewer-bar" }, $("button", { class: "btn", disabled: i === 0, onclick: () => show(i - 1), text: "‹ Previous" }), $("span", { class: "sub", text: `Slide ${s.n ?? s.label} · ${i + 1} of ${l.slides.length}` }), $("button", { class: "btn", disabled: i === l.slides.length - 1, onclick: () => show(i + 1), text: "Next ›" })),
      slideFigure(s), s.text ? $("details", {}, $("summary", { text: "Slide text (from OCR; may contain errors)" }), $("pre", { text: s.text })) : $("p", { class: "sub", text: "No text was extracted from this slide." }),
      citing.length ? $("p", { class: "sub" }, `${citing.length} question${citing.length > 1 ? "s" : ""} cite this slide: `, citing.slice(0, 6).map((q, k) => [k ? "; " : "", $("a", { href: `#/practice/${enc("lecture:" + l.id)}/${enc(q.id)}`, text: safeHtml(q.stem).textContent.slice(0, 60) })])) : ""); };
  view(l.title, crumbs(["Subjects", "#/"], [w.subject.title, "#/subject/" + enc(w.subject.id)], [w.module.title]), $("h1", { text: l.title }),
    $("p", { class: "sub" }, l.source ? `Source: ${l.source.title}. ` : "", l.verified_on ? `Marked verified on Sina on ${l.verified_on}. ` : "", $("a", { href: `${SINA}#/lecture/${l.sina_id}`, target: "_blank", rel: "noopener", text: "Open on Sina" })),
    $("p", { class: "actions" }, usable.length ? btn(`Practise ${usable.length} questions`, "#/practice/" + enc("lecture:" + l.id), "primary") : "", usableCards.length ? btn(`Review ${usableCards.length} flashcards`, "#/cards/" + enc("lecture:" + l.id)) : ""),
    figureNote(l.questions.length - usable.length + l.flashcards.length - usableCards.length, "questions and flashcards", l.sina_id),
    l.exam_points && l.exam_points.length ? [$("h2", { text: "Exam points" }), $("ul", {}, l.exam_points.map((t) => $("li", {}, safeHtml(t, true))))] : "",
    $("h2", { text: "Summary" }), l.sections.map((s) => $("section", { class: "card", id: s.id }, $("h3", { text: s.title }), safeHtml(s.html))),
    l.deeper && l.deeper.length ? [$("h2", { text: "Going deeper" }), l.deeper.map((d) => $("details", {}, $("summary", { text: d.title }), safeHtml(d.html)))] : "",
    l.slides.length ? [$("h2", { id: "slides", text: `Slides (${l.slides.length})` }), viewer] : "",
    l.references.length ? [$("h2", { text: "Further reading" }), $("ul", {}, l.references.map((r) => $("li", {}, $("a", { href: r.url, target: "_blank", rel: "noopener", text: r.title }), r.kind ? ` (${r.kind})` : "", r.why ? " — " + r.why : "")))] : "");
  if (l.slides.length) show(Math.max(0, l.slides.findIndex((s) => s.id === slideId)));
}

async function practice(scope, onlyId) {
  const sc = await scopeItems(scope); if (!sc) return missing();
  const mode = store.get("mode", "all"), history = () => store.get("answers", {});
  const all = sc.questions.filter((q) => !needsFigure(q)), skipped = sc.questions.length - all.length;
  let list = onlyId ? all.filter((q) => q.id === onlyId) : filterQuestions(all, history(), mode), i = 0, total = 0;
  const head = [crumbs(["Subjects", "#/"], [sc.title, sc.back]), $("h1", { text: "Practice: " + sc.title })];
  const modes = onlyId ? "" : $("p", { class: "actions", role: "group", "aria-label": "Which questions" }, [["all", `All (${all.length})`], ["new", `Not yet answered (${filterQuestions(all, history(), "new").length})`], ["mistakes", `Answered wrong last time (${filterQuestions(all, history(), "mistakes").length})`]]
    .map(([m, label]) => $("button", { class: "btn" + (m === mode ? " on" : ""), "aria-pressed": String(m === mode), text: label, onclick: () => { store.set("mode", m); practice(scope); } })));
  if (!list.length) return view("Practice", head, modes, figureNote(skipped, "questions"), $("p", { text: all.length ? "No questions match this filter." : "This selection has no questions that can be shown here." }), $("p", {}, $("a", { href: sc.back, text: "Back" })));
  const ask = () => {
    const q = list[i], multi = isMulti(q), box = $("div", { class: "card question" }), chosen = new Set();
    const opts = q.options.map((o, k) => { const input = $("input", { type: multi ? "checkbox" : "radio", name: "opt", value: k, id: "o" + k }); input.addEventListener("change", () => { if (multi) (input.checked ? chosen.add(k) : chosen.delete(k)); else { chosen.clear(); chosen.add(k); } check.disabled = !chosen.size; }); return $("li", {}, input, $("label", { for: "o" + k }, safeHtml(o, true))); });
    const check = $("button", { class: "btn primary", disabled: true, text: "Check answer", onclick: () => answer() });
    const answer = () => {
      const pts = points(q, [...chosen]); total += pts; store.set("answers", record(history(), q.id, pts));
      opts.forEach((li, k) => { li.querySelector("input").disabled = true; const right = q.answer.includes(k), picked = chosen.has(k); li.className = right ? "right" : picked ? "wrong" : "";
        li.append($("span", { class: "mark", text: right ? (picked ? " ✓ correct" : " ✓ correct answer") : picked ? " ✗ your answer" : "" }), q.option_notes && q.option_notes[k] ? $("div", { class: "sub", text: q.option_notes[k] }) : ""); });
      check.replaceWith($("div", { class: "feedback", role: "status" },
        $("p", {}, $("strong", { text: pts === 1 ? "Correct." : pts > 0 ? `Partly correct: ${Math.round(pts * 100) / 100} of 1 point.` : "Not correct." }), multi && pts < 1 ? " Marking as on Sina: any wrong choice scores 0; otherwise right choices ÷ number of right answers." : ""),
        q.explanation ? $("p", {}, safeHtml(q.explanation, true)) : "",
        q.answer_key ? $("p", { class: "note", text: q.answer_key === "written-by-sina" ? "This paper came without an answer key. The answer shown was written by Sina from the lectures." : "Part of this paper came without an answer key; Sina wrote those answers from the lectures." }) : "",
        q.source_note ? $("p", { class: "sub", text: "Source: " + q.source_note }) : "",
        q._lecture ? q.slides.map((s) => { const sl = q._lecture.slides.find((x) => x.id === s.id); return sl ? $("a", { href: `#/lecture/${enc(q._lecture.id)}/${enc(sl.id)}`, title: "Open this slide in the lecture" }, slideFigure(sl, s.boxes)) : ""; }) : "",
        q._lecture && scope.split(":")[0] !== "lecture" ? $("p", { class: "sub" }, "From ", $("a", { href: "#/lecture/" + enc(q._lecture.id), text: q._lecture.title })) : "",
        $("button", { class: "btn primary", text: i + 1 < list.length ? "Next question" : "Finish", onclick: () => { i++; i < list.length ? ask() : done(); } })));
      box.querySelector(".feedback button").focus();
    };
    box.append($("p", { class: "sub", text: `Question ${i + 1} of ${list.length}` + (multi ? ` · ${q.hint || "choose all correct answers"}` : "") }), $("h2", { class: "stem" }, safeHtml(q.stem, true)), $("ol", { class: "options", type: "A" }, opts), check);
    view("Practice", head, modes, i === 0 ? figureNote(skipped, "questions") : "", box);
  };
  const done = () => view("Practice finished", head, $("div", { class: "card" }, $("h2", { text: "Session finished" }), $("p", { text: `Score: ${Math.round(total * 100) / 100} of ${list.length} points.` }), $("p", { class: "sub", text: "Your answers are saved on this device only." }),
    $("p", { class: "actions" }, $("button", { class: "btn primary", text: "Practise again", onclick: () => practice(scope, onlyId) }), btn("Back", sc.back))));
  ask();
}

async function cards(scope) {
  const sc = await scopeItems(scope); if (!sc) return missing();
  const all = sc.cards.filter((c) => !needsFigure(c)), skipped = sc.cards.length - all.length, progress = () => store.get("cards", {});
  const { due, fresh, later } = dueCards(all, progress()); const queue = [...due, ...fresh]; let i = 0;
  const head = [crumbs(["Subjects", "#/"], [sc.title, sc.back]), $("h1", { text: "Flashcards: " + sc.title }), $("p", { class: "sub", text: `${due.length} due · ${fresh.length} new · ${later} scheduled for later` })];
  if (!queue.length) return view("Flashcards", head, figureNote(skipped, "flashcards"), $("p", { text: all.length ? "Nothing is due. Come back when cards are scheduled." : "This selection has no flashcards that can be shown here." }), $("p", {}, $("a", { href: sc.back, text: "Back" })));
  const showCard = () => {
    const c = queue[i], e = progress()[c.id] || null, back = $("div", { class: "back", hidden: true }, safeHtml(c.back),
      $("div", { class: "actions rate", role: "group", "aria-label": "How well did you know it?" }, [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]].map(([g, label]) => $("button", { class: "btn", onclick: () => { store.set("cards", { ...progress(), [c.id]: srsNext(e, g) }); i++; i < queue.length ? showCard() : view("Flashcards finished", head, $("div", { class: "card" }, $("h2", { text: "Review finished" }), $("p", { class: "sub", text: "Scheduling follows the same intervals as Sina. Progress is saved on this device only." }), $("p", { class: "actions" }, btn("Back", sc.back)))); } }, label, $("small", { text: " " + srsLabel(srsNext(e, g)[1]) })))));
    const reveal = $("button", { class: "btn primary", text: "Show answer", onclick: () => { back.hidden = false; reveal.remove(); back.querySelector("button").focus(); } });
    view("Flashcards", head, i === 0 ? figureNote(skipped, "flashcards") : "", $("div", { class: "card flash" }, $("p", { class: "sub", text: `Card ${i + 1} of ${queue.length}` + (c._lecture ? ` · ${c._lecture.title}` : "") }), $("h2", { class: "stem" }, safeHtml(c.front, true)), reveal, back));
  };
  showCard();
}

async function papers(sid) {
  await index(); const s = subjectOf(sid); if (!s || !s.papers_file) return missing(); const pf = await load(s.papers_file);
  view("Past papers", crumbs(["Subjects", "#/"], [s.title, "#/subject/" + enc(s.id)], ["Past papers"]), $("h1", { text: "Past papers: " + s.title }),
    $("ul", { class: "list" }, pf.papers.map((p) => $("li", {}, $("a", { href: `#/paper/${enc(sid)}/${enc(p.id)}`, text: p.title }), $("span", { class: "sub", text: [p.year, p.questions.length ? p.questions.length + " questions" : "document only"].filter(Boolean).join(" · ") })))));
}
async function paper(sid, pid) {
  const sc = await scopeItems(`paper:${sid}|${pid}`); if (!sc) return missing(); const p = sc.paper, s = subjectOf(sid);
  view(p.title, crumbs(["Subjects", "#/"], [s.title, "#/subject/" + enc(sid)], ["Past papers", "#/papers/" + enc(sid)]), $("h1", { text: p.title }), $("p", { class: "sub", text: [p.year, p.origin === "sina" ? "Written by Sina" : "Original paper"].filter(Boolean).join(" · ") }),
    p.note ? $("div", { class: "card" }, safeHtml(p.note)) : "",
    p.answer_key ? $("p", { class: "note", text: p.answer_key === "written-by-sina" ? "This paper came without an answer key. The answers were written by Sina from the lectures." : "Part of this paper came without an answer key; Sina wrote those answers from the lectures." }) : "",
    (p.links || []).length ? $("ul", {}, p.links.map((k) => $("li", {}, $("a", { href: /^https?:/.test(k.url) ? k.url : SINA + k.url, target: "_blank", rel: "noopener", text: k.label })))) : "",
    sc.questions.length ? [$("p", { class: "actions" }, btn(`Practise ${sc.questions.filter((q) => !needsFigure(q)).length} questions`, "#/practice/" + enc(`paper:${sid}|${pid}`), "primary")),
      $("h2", { text: "Questions" }), $("ol", {}, sc.questions.map((q) => $("li", {}, safeHtml(q.stem).textContent)))] : $("p", { class: "sub", text: "This paper is available as a document only; it has no questions to practise here." }));
}

let CORPUS = null;
async function corpus() { if (!CORPUS) { await index(); const t = performance.now(); const parts = await Promise.all(INDEX.subjects.map((s) => load(s.search_file).then((f) => f.docs.map((d) => [...d, s.id])))); const docs = parts.flat(); CORPUS = { docs: prepare(docs).map((d, k) => ({ ...d, subject: docs[k][5] })), ms: Math.round(performance.now() - t) }; } return CORPUS; }
async function searchPage(query = "", type = "", sid = "") {
  await index();
  const input = $("input", { name: "q", type: "search", value: query, "aria-label": "Search", placeholder: "Search" });
  const types = $("select", { name: "type", "aria-label": "Kind" }, [["", "Everything"], ["lecture", "Lectures"], ["section", "Summary sections"], ["slide", "Slides"], ["question", "Questions"], ["flashcard", "Flashcards"], ["paper", "Past papers"]].map(([v, t]) => $("option", { value: v, selected: v === type, text: t })));
  const subj = $("select", { name: "subject", "aria-label": "Subject" }, $("option", { value: "", text: "All subjects" }), INDEX.subjects.map((s) => $("option", { value: s.id, selected: s.id === sid, text: s.title })));
  const go = () => { location.hash = `#/search/${enc(input.value)}/${enc(types.value)}/${enc(subj.value)}`; };
  const form = $("form", { class: "searchbar", role: "search", onsubmit: (e) => { e.preventDefault(); go(); } }, input, types, subj, $("button", { class: "btn primary", text: "Search" }));
  types.addEventListener("change", go); subj.addEventListener("change", go);
  const out = $("div", { "aria-live": "polite" });
  view("Search", $("h1", { text: "Search" }), form, out); input.focus();
  if (!query.trim()) return;
  out.textContent = "Loading the search text…";
  const c = await corpus(), t = performance.now(), pool = sid ? c.docs.filter((d) => d.subject === sid) : c.docs, r = search(pool, query, { types: type ? [type] : null, limit: 60 }), ms = performance.now() - t;
  const href = (d) => d.type === "lecture" ? "#/lecture/" + enc(d.id) : d.type === "section" ? "#/lecture/" + enc(d.container) : d.type === "slide" ? `#/lecture/${enc(d.container)}/${enc(d.id)}` : d.type === "flashcard" ? "#/cards/" + enc("lecture:" + d.container)
    : d.type === "paper" ? `#/paper/${enc(d.subject)}/${enc(d.id)}` : d.container.startsWith("lec:") ? `#/practice/${enc("lecture:" + d.container)}/${enc(d.id)}` : `#/practice/${enc(`paper:${d.subject}|${d.container}`)}/${enc(d.id)}`;
  out.replaceChildren($("p", { class: "sub", "data-search-ms": ms.toFixed(1), "data-load-ms": c.ms, text: `${r.total.toLocaleString("en-GB")} result${r.total === 1 ? "" : "s"}${r.total > r.hits.length ? `, showing the first ${r.hits.length}` : ""}.` }),
    $("ul", { class: "results" }, r.hits.map((d) => $("li", {}, $("span", { class: "tag", text: d.type }), " ", $("a", { href: href(d), text: d.title || d.id }), $("div", { class: "sub", text: [WHERE.get(d.container) ? WHERE.get(d.container).entry.title : "", excerpt(d, query)].filter(Boolean).join(" — ") })))));
}

function me() {
  const answers = store.get("answers", {}), cardsP = store.get("cards", {}), a = Object.values(answers);
  view("My progress", crumbs(["Subjects", "#/"], ["My progress"]), $("h1", { text: "My progress" }), $("p", { class: "sub", text: "Kept in this browser on this device only. It is not sent anywhere and is not part of the shared content." }),
    $("ul", {}, $("li", { text: `Questions answered: ${a.length}` }), $("li", { text: `Fully correct on the last attempt: ${a.filter((x) => x.pts === 1).length}` }), $("li", { text: `Flashcards reviewed: ${Object.keys(cardsP).length}` }), $("li", { text: `Flashcards due today: ${Object.values(cardsP).filter((e) => e[0] <= dayNo()).length}` })),
    $("p", { class: "sub", text: "These are simple counts of what you have done here. They are not a measure of mastery." }),
    $("p", { class: "actions" }, $("button", { class: "btn", text: "Download my data", onclick: () => { const u = URL.createObjectURL(new Blob([JSON.stringify({ format: "sina-brain-personal-1", answers, cards: cardsP }, null, 1)], { type: "application/json" })); $("a", { href: u, download: "sina-brain-my-data.json" }).click(); URL.revokeObjectURL(u); } }),
      $("button", { class: "btn", text: "Delete my data from this device", onclick: () => { if (confirm("Delete your answers and flashcard progress from this device?")) { for (const k of ["answers", "cards", "mode"]) localStorage.removeItem("brain:" + k); me(); } } })));
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent), [kind, a, b, c] = parts;
  const page = kind === "subject" ? subject(a) : kind === "lecture" ? lecture(a, b) : kind === "practice" ? practice(a, b) : kind === "cards" ? cards(a) : kind === "papers" ? papers(a) : kind === "paper" ? paper(a, b) : kind === "search" ? searchPage(a, b, c) : kind === "me" ? me() : home();
  Promise.resolve(page).catch((e) => view("Error", $("h1", { text: "Could not load data" }), $("p", { text: e.message + ". Run: npm run build:export, and open this page through a web server." })));
}
addEventListener("hashchange", route); route();
