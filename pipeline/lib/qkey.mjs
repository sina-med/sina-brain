// Question identity, ported from qKey() in Sina's js/app.js.
// Must stay byte-for-byte equivalent: Sina stores student progress under this key.

/** Hash of the stem and options, before aliases are applied. */
export function rawQKey(q) {
  const t = (q.q || "") + "|" + (q.options || []).join("|");
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** The key Sina uses: the raw hash, or the older key it is aliased to (js/data/qalias.js). */
export function qKey(q, aliases = {}) {
  const k = rawQKey(q);
  return aliases[k] || k;
}
