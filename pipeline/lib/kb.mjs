// Reads the knowledge base from disk.
import { join } from "node:path";
import { readJsonl, listJsonl } from "./util.mjs";

/** @returns {{records: Array<{file:string,row:object}>, relations: Array<{file:string,row:object}>, registry: object[]}} */
export function loadKb(kb = "kb") {
  const records = [], relations = [];
  for (const dir of ["records", "sources"]) for (const f of listJsonl(join(kb, dir))) for (const row of readJsonl(join(kb, dir, f))) records.push({ file: `${dir}/${f}`, row });
  for (const f of listJsonl(join(kb, "relations"))) for (const row of readJsonl(join(kb, "relations", f))) relations.push({ file: `relations/${f}`, row });
  return { records, relations, registry: readJsonl(join(kb, "admin/id-registry.jsonl")) };
}
