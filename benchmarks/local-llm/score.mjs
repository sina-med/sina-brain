#!/usr/bin/env node
// Scores one model's saved answers with the hidden tests. Uses no model.
// Usage: node score.mjs <deepseek|qwen|reference>
// A hand-corrected answer saved next to the original as task-N.attempt-A.fixed.mjs is scored too, separately.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const key = process.argv[2];
if (!key) { console.error("Usage: node score.mjs <deepseek|qwen|reference>"); process.exit(2); }
const ATTEMPTS = JSON.parse(fs.readFileSync(path.join(here, "models.json"), "utf8")).settings.attempts;
const AUTO = [1, 2, 3, 4, 5, 6, 9], MANUAL = [7, 8], MUTANTS_NEEDED = 4;
const file = (n, a, suffix = "") => key === "reference" ? path.join(here, "hidden", "reference", `task-${n}.mjs`) : path.join(here, "answers", key, `task-${n}.attempt-${a}${suffix}.mjs`);
const nodeTest = (f, env = {}, cwd = here) => spawnSync(process.execPath, ["--test", f], { cwd, env: { ...process.env, ...env }, encoding: "utf8", timeout: 60000 });
const count = (out, word) => Number((out.match(new RegExp(`^# ${word} (\\d+)`, "m")) || [])[1] || 0);

function hidden(n, f) {
  const r = nodeTest(path.join(here, "hidden", `task-${n}.test.mjs`), { ANSWER: f });
  return { pass: r.status === 0, detail: `${count(r.stdout, "pass")} of ${count(r.stdout, "tests")} hidden tests` + (r.error ? " (timed out)" : "") };
}
function task4(f) {   // the answer is a test file: it must pass on the real function and fail on the broken ones
  const dir = path.join(here, "hidden", "nameKey"), names = fs.readdirSync(dir).filter((x) => x.startsWith("mutant-"));
  const against = (impl) => { const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bench4-"));
    fs.copyFileSync(path.join(dir, impl), path.join(tmp, "nameKey.mjs")); fs.copyFileSync(f, path.join(tmp, "answer.test.mjs"));
    const r = nodeTest("answer.test.mjs", {}, tmp); fs.rmSync(tmp, { recursive: true, force: true }); return r.status === 0 && count(r.stdout, "pass") > 0; };
  const real = against("real.mjs"), caught = names.filter((m) => !against(m));
  return { pass: real && caught.length >= MUTANTS_NEEDED, detail: `${real ? "passes" : "FAILS"} on the real function; catches ${caught.length} of ${names.length} broken versions` };
}
const score = (n, f) => !fs.existsSync(f) ? null : n === 4 ? task4(f) : hidden(n, f);
const changed = (a, b) => { const A = fs.readFileSync(a, "utf8").split("\n"), B = new Set(fs.readFileSync(b, "utf8").split("\n")); return A.filter((l) => !B.has(l)).length; };

const tasks = AUTO.map((n) => {
  const attempts = [];
  for (let a = 1; a <= (key === "reference" ? 1 : ATTEMPTS); a++) {
    const s = score(n, file(n, a)); if (!s) { attempts.push({ attempt: a, missing: true }); continue; }
    const fx = file(n, a, ".fixed"), fixed = key !== "reference" && fs.existsSync(fx) ? { ...score(n, fx), lines_changed: changed(fx, file(n, a)) } : undefined;
    attempts.push({ attempt: a, ...s, fixed });
  }
  const firstPass = attempts.find((x) => x.pass);
  return { task: n, first_attempt_pass: !!attempts[0].pass, pass_within_attempts: !!firstPass, passing_attempt: firstPass ? firstPass.attempt : null, attempts };
});
const summary = { model: key, scored_at: new Date().toISOString(), automatic_tasks: AUTO.length,
  first_attempt_passes: tasks.filter((t) => t.first_attempt_pass).length, passes_within_attempts: tasks.filter((t) => t.pass_within_attempts).length,
  usefulness_tasks_1_to_6_first_attempt: tasks.filter((t) => t.task <= 6 && t.first_attempt_pass).length, manual_tasks: MANUAL, tasks };
fs.mkdirSync(path.join(here, "results"), { recursive: true });
fs.writeFileSync(path.join(here, "results", key + ".json"), JSON.stringify(summary, null, 2) + "\n");

console.log(`Model: ${key}\n\nTask  1st attempt  within ${ATTEMPTS}  detail (attempt 1)`);
for (const t of tasks) console.log(`${String(t.task).padEnd(5)} ${(t.first_attempt_pass ? "pass" : "fail").padEnd(12)} ${(t.pass_within_attempts ? "pass (#" + t.passing_attempt + ")" : "fail").padEnd(10)} ${t.attempts[0].missing ? "no answer file" : t.attempts[0].detail}`
  + t.attempts.filter((x) => x.fixed).map((x) => `\n      attempt ${x.attempt} after manual correction (${x.fixed.lines_changed} lines changed): ${x.fixed.pass ? "pass" : "fail"}`).join(""));
console.log(`\nFirst attempt: ${summary.first_attempt_passes} of ${AUTO.length}.  Within ${ATTEMPTS} attempts: ${summary.passes_within_attempts} of ${AUTO.length}.`);
console.log(`Tasks 1 to 6 passed first time: ${summary.usefulness_tasks_1_to_6_first_attempt} of 6 (threshold agreed beforehand: 5).`);
console.log(`Tasks ${MANUAL.join(" and ")} are marked by hand with hidden/RUBRIC.md. Written to results/${key}.json`);
