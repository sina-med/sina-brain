export function orphanConcepts(concepts, relations) {
  const linked = new Set();
  for (const r of relations) if (r.status !== "rejected" && r.src !== r.dst && r.src.startsWith("c:") && r.dst.startsWith("c:")) { linked.add(r.src); linked.add(r.dst); }
  return concepts.filter((c) => c.status !== "rejected" && !linked.has(c.id)).map((c) => c.id).sort();
}
