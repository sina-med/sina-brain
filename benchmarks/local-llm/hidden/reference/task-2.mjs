export function srsNext(e, g, d) {
  let ivl = e ? e[1] : 0, ease = e ? e[2] : 250, lap = e ? e[3] : 0, n;
  if (g === 1) { if (ivl > 0) { lap++; ease = Math.max(130, ease - 20); } return [d, 0, ease, lap]; }
  if (ivl < 1) { if (g === 2) return [d, 0, ease, lap]; n = g === 4 ? 4 : 1; }
  else if (g === 2) { n = Math.max(ivl + 1, Math.round(ivl * 1.2)); ease = Math.max(130, ease - 15); }
  else if (g === 3) n = Math.max(ivl + 1, Math.round(ivl * ease / 100));
  else { n = Math.max(ivl + 2, Math.round(ivl * ease / 100 * 1.3)); ease += 15; }
  n = Math.min(n, 3650);
  return [d + n, n, ease, lap];
}
