// End-to-end check of the application in a real browser. Not part of `npm test`: it needs Playwright and Chromium,
// which are not project dependencies. Run: npm run build:export && node test/e2e/run.cjs [--shots docs/img]
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const { chromium } = require("playwright");
const root = path.join(__dirname, "../../site"), shots = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const types = { ".html": "text/html", ".json": "application/json", ".js": "text/javascript", ".css": "text/css" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html")); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": types[path.extname(f)] || "text/plain" }); fs.createReadStream(f).pipe(r); });
const results = [];
const step = async (name, fn) => { const t = Date.now(); await fn(); results.push(`ok  ${name} (${Date.now() - t} ms)`); };
(async () => {
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${srv.address().port}/`, b = await chromium.launch(), errors = [];
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.route(/sina-med\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#ddd"/></svg>' }));   // slide images live on Sina; stubbed so the test needs no network
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const go = async (hash) => { await p.goto("about:blank"); await p.goto(base + "index.html" + hash); await p.waitForSelector("h1"); };   // a fresh document each time, so the wait cannot match the previous page
  const shot = async (name) => { if (shots) await p.screenshot({ path: path.join(shots, name + ".png") }); };

  await step("home lists every subject", async () => { await go("#/"); assert.equal(await p.locator("ul.list li").count(), 30); });
  await step("navigation: subject, then lecture", async () => { await p.click("text=Anatomy 3"); await p.waitForSelector("text=Faciomaxillary"); assert.equal(await p.locator("ul.list li").count(), 27); await p.click("text=Anatomy of the larynx"); await p.waitForSelector(".viewer img"); assert.equal(await p.locator("section.card").count(), 10); });
  await step("slide viewer steps through slides and shows text", async () => { const first = await p.locator(".viewer-bar .sub").textContent(); await p.click("text=Next ›"); const second = await p.locator(".viewer-bar .sub").textContent(); assert.notEqual(first, second); assert.match(second, /2 of 21/); assert.ok(await p.locator(".viewer details").count()); await p.locator("#slides").scrollIntoViewIfNeeded(); await shot("app-slides"); });
  await step("no script or event handler from record HTML reaches the page", async () => { assert.equal(await p.locator("main script, main [onclick], main [onerror]").count(), 0); });
  await step("single-answer question: marking, explanation and slide citation", async () => {
    await go("#/practice/" + encodeURIComponent("lecture:lec:anat3-larynx") + "/" + encodeURIComponent("q:100iv8a")); await p.waitForSelector("ol.options");
    assert.equal(await p.locator("ol.options input[type=radio]").count(), 4); assert.ok(await p.locator("text=Check answer").isDisabled());
    await p.check("#o0"); await p.click("text=Check answer"); await p.waitForSelector(".feedback");
    assert.match(await p.locator(".feedback").textContent(), /Not correct/); assert.equal(await p.locator("li.right").count(), 1); assert.equal(await p.locator("li.wrong").count(), 1);
    assert.match(await p.locator("li.right").textContent(), /external branch of the superior laryngeal nerve/i); await shot("app-question");
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("brain:answers"))); assert.deepEqual(Object.keys(saved), ["q:100iv8a"]); assert.equal(saved["q:100iv8a"].pts, 0); });
  await step("multi-answer question: checkboxes and Sina's partial credit", async () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, "data/modules/physio/renal-physiology.json"))); let lec, q;
    for (const l of data.lectures) { q = l.questions.find((x) => x.answer.length === 3 && !x.figure_target); if (q) { lec = l; break; } }
    await go(`#/practice/${encodeURIComponent("lecture:" + lec.id)}/${encodeURIComponent(q.id)}`); await p.waitForSelector("ol.options");
    assert.equal(await p.locator("ol.options input[type=checkbox]").count(), q.options.length);
    await p.check("#o" + q.answer[0]); await p.check("#o" + q.answer[1]); await p.click("text=Check answer"); await p.waitForSelector(".feedback");
    assert.match(await p.locator(".feedback").textContent(), /Partly correct: 0\.67 of 1 point/); });
  await step("filter by not-yet-answered and by mistakes", async () => { await go("#/practice/" + encodeURIComponent("lecture:lec:anat3-larynx")); await p.waitForSelector("ol.options");
    assert.match(await p.locator(".actions").first().textContent(), /Answered wrong last time \(1\)/); await p.click("text=Answered wrong last time"); await p.waitForSelector("text=Question 1 of 1"); });
  await step("module and subject scopes gather questions across lectures", async () => { await go("#/practice/" + encodeURIComponent("module:mod:anat3/ent")); await p.click("text=All ("); await p.waitForSelector("ol.options"); const n = +(await p.locator(".question .sub").first().textContent()).match(/of (\d+)/)[1]; assert.ok(n > 150, "module has " + n); });
  await step("flashcards: reveal, rate, schedule", async () => { await go("#/cards/" + encodeURIComponent("lecture:lec:anat3-larynx")); await p.waitForSelector("text=Show answer"); assert.ok(await p.locator(".back").isHidden()); await p.click("text=Show answer"); assert.ok(await p.locator(".back").isVisible()); await shot("app-flashcard");
    await p.click(".rate button:has-text('Good')"); await p.waitForSelector("text=Card 2 of"); const c = await p.evaluate(() => JSON.parse(localStorage.getItem("brain:cards"))); const e = Object.values(c)[0]; assert.equal(e[1], 1); assert.equal(e[2], 250); });
  await step("past papers: list, paper page, practice", async () => { await go("#/papers/" + encodeURIComponent("subj:anat3")); assert.ok(await p.locator("ul.list li").count() > 5); await p.locator('ul.list li:has-text("questions") a').first().click(); await p.waitForSelector("text=Practise"); await shot("app-paper"); await p.click("a.btn.primary"); await p.waitForSelector("ol.options"); });
  await step("search across everything, with kind and subject filters", async () => { await go("#/search/" + encodeURIComponent("recurrent laryngeal")); await p.waitForSelector("ul.results li", { timeout: 60000 });
    const info = p.locator("[data-search-ms]"); results.push(`    search corpus loaded in the browser in ${await info.getAttribute("data-load-ms")} ms; query took ${await info.getAttribute("data-search-ms")} ms; ${(await info.textContent()).trim()}`);
    await shot("app-search"); await p.selectOption("select[name=type]", "question"); await p.waitForFunction(() => [...document.querySelectorAll("ul.results .tag")].every((t) => t.textContent === "question") && document.querySelectorAll("ul.results li").length > 0);
    await p.selectOption("select[name=subject]", "subj:physio"); await p.waitForFunction(() => location.hash.includes("subj%3Aphysio")); await p.waitForSelector("[data-search-ms]"); });
  await step("personal data stays in the browser and can be deleted", async () => { await go("#/me"); assert.match(await p.locator("main").textContent(), /Questions answered: [1-9]/); p.once("dialog", (d) => d.accept()); await p.click("text=Delete my data"); await p.waitForSelector("text=Questions answered: 0"); assert.equal(await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("brain:")).length), 0); });
  await step("phone width: no horizontal overflow on the main pages", async () => { await p.setViewportSize({ width: 390, height: 800 }); for (const h of ["#/", "#/subject/" + encodeURIComponent("subj:anat3"), "#/lecture/" + encodeURIComponent("lec:anat3-larynx"), "#/practice/" + encodeURIComponent("lecture:lec:anat3-larynx")]) { await go(h); await p.waitForTimeout(150); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "overflow at " + h); } });
  assert.deepEqual(errors, [], "console errors: " + errors.join(" | "));
  console.log(results.join("\n")); console.log(`${results.filter((r) => r.startsWith("ok")).length} end-to-end checks passed, 0 console errors`);
  await b.close(); srv.close();
})().catch((e) => { console.log(results.join("\n")); console.error("FAILED:", e.message); process.exit(1); });
