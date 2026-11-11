#!/usr/bin/env node
// Checks the knowledge base: schemas, unique IDs, references that resolve, registry consistency.
// Exits with status 1 when anything is wrong.  Usage: node pipeline/validate.mjs [--kb kb]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv";
import { loadKb } from "./lib/kb.mjs";
import { parseArgs } from "./lib/util.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = (name) => JSON.parse(readFileSync(join(here, "../schemas", name), "utf8"));

/** @returns {{errors: string[], checked: {records:number, relations:number, registry:number}}} */
export function validateKb(kb = "kb") {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const okRecord = ajv.compile(schema("record.schema.json"));
  const okRelation = ajv.compile(schema("relation.schema.json"));
  const okRegistry = ajv.compile(schema("registry.schema.json"));
  const { records, relations, registry } = loadKb(kb);
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const explain = (v) => (v.errors || []).map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");

  // records: schema and unique IDs
  const byId = new Map();
  for (const { file, row } of records) {
    const where = `${file} ${row && row.id ? row.id : "(no id)"}`;
    if (!okRecord(row)) { err(where, explain(okRecord)); if (!row || !row.id) continue; }
    if (byId.has(row.id)) err(where, `duplicate id, also in ${byId.get(row.id).file}`);
    else byId.set(row.id, { file, row });
  }

  // records: references resolve, and point at the right kind of record
  const refFields = { program: "program", subject: "subject", module: "module", lecture: "lecture", source: "source" };
  for (const { file, row } of byId.values()) {
    const where = `${file} ${row.id}`;
    for (const [field, type] of Object.entries(refFields)) {
      if (!row[field]) continue;
      const t = byId.get(row[field]);
      if (!t) err(where, `${field} "${row[field]}" does not exist`);
      else if (t.row.type !== type) err(where, `${field} "${row[field]}" is a ${t.row.type}, expected a ${type}`);
    }
    for (const p of row.provenance || []) {
      if (!byId.has(p.source)) err(where, `provenance source "${p.source}" does not exist`);
      if (p.unit && !byId.has(p.unit)) err(where, `provenance unit "${p.unit}" does not exist`);
    }
    if (row.type === "mcq") {
      const b = row.body || {};
      if (Array.isArray(b.answer) && Array.isArray(b.options) && b.answer.some((a) => a >= b.options.length)) err(where, "answer index beyond the last option");
      if (b.option_notes && b.options && b.option_notes.length !== b.options.length) err(where, "option_notes count differs from options count");
    }
    if (row.type === "exam") for (const g of (row.body && row.body.groups) || []) for (const l of g.lectures || []) if (!byId.has(l)) err(where, `scope lecture "${l}" does not exist`);
  }

  // relations
  const relIds = new Set();
  for (const { file, row } of relations) {
    const where = `${file} ${row && row.id ? row.id : "(no id)"}`;
    if (!okRelation(row)) { err(where, explain(okRelation)); continue; }
    if (relIds.has(row.id)) err(where, "duplicate relation id");
    relIds.add(row.id);
    if (!byId.has(row.src)) err(where, `src "${row.src}" does not exist`);
    if (!byId.has(row.dst)) err(where, `dst "${row.dst}" does not exist`);
    if (row.src === row.dst) err(where, "relation from a record to itself");
    if (row.origin === "ai" && row.status === "approved" && !row.reviewed_by) err(where, "AI-suggested relation is approved but has no reviewer");
  }

  // registry: every published record is registered as active, and nothing active is missing
  const reg = new Map();
  for (const e of registry) {
    if (!okRegistry(e)) err(`registry ${e && e.id}`, explain(okRegistry));
    if (reg.has(e.id)) err(`registry ${e.id}`, "listed twice");
    reg.set(e.id, e);
  }
  for (const { file, row } of byId.values()) {
    const e = reg.get(row.id);
    if (!e) err(`${file} ${row.id}`, "not in the ID registry");
    else if (e.status !== "active") err(`${file} ${row.id}`, `registry says "${e.status}" but the record is present`);
    else if (e.type !== row.type) err(`${file} ${row.id}`, `registry type "${e.type}" differs from record type "${row.type}"`);
  }
  for (const e of reg.values()) {
    if (e.status === "active" && !byId.has(e.id)) err(`registry ${e.id}`, "active in the registry but no record exists");
    if (e.status === "merged" && (!e.redirect || !reg.has(e.redirect))) err(`registry ${e.id}`, "merged without a valid redirect");
  }

  return { errors, checked: { records: records.length, relations: relations.length, registry: registry.length } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, checked } = validateKb(parseArgs(process.argv.slice(2)).kb || "kb");
  console.log(`Checked ${checked.records} records, ${checked.relations} relations, ${checked.registry} registry entries.`);
  if (errors.length) {
    for (const e of errors.slice(0, 50)) console.error("  " + e);
    if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
    console.error(`${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log("No problems found.");
}
