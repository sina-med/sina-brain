export function endsMidSentence(block, quote) {
  const words = (s) => s.split(/\s+/).filter(Boolean), q = words(quote);
  if (!q.length) return false;
  const toks = [];
  for (const line of block.split("\n")) { const w = words(line); w.forEach((x, i) => toks.push({ w: x, last: i === w.length - 1 })); }
  for (let i = 0; i + q.length <= toks.length; i++) if (q.every((w, k) => toks[i + k].w === w)) { const end = toks[i + q.length - 1]; return end.last && i + q.length < toks.length && !/[.!?:;]$/.test(end.w); }
  return false;
}
